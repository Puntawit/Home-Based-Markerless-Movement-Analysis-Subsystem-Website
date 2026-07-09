from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from app.core.auth import (
    CurrentUser,
    create_playback_token,
    get_current_user,
    require_patient,
    require_patient_access,
    user_from_access_payload,
    verify_signed_token,
)
from app.core.config import get_settings
from app.db.mongo import get_db
from app.schemas import PlaybackTokenResponse, UploadResponse
from app.services.audit import audit_event
from app.services.sessions import utc_now
from app.services.storage import resolve_local_storage_path, save_local_video_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])

SENSITIVE_HEADERS = {
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
}


async def enforce_upload_quota(patient_id: str) -> None:
    settings = get_settings()
    db = get_db()
    today = utc_now()[:10]
    daily_uploads = await db.uploads.count_documents({"patientId": patient_id, "createdAt": {"$gte": f"{today}T"}})
    if daily_uploads >= settings.max_uploads_per_patient_per_day:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Daily demo upload limit reached.")

    cursor = db.uploads.find({"patientId": patient_id}, {"sizeBytes": 1})
    total_bytes = 0
    async for upload in cursor:
        total_bytes += int(upload.get("sizeBytes") or 0)
    max_total_bytes = settings.max_total_upload_mb_per_patient * 1024 * 1024
    if total_bytes >= max_total_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Demo patient upload quota reached.")


@router.post("/video", response_model=UploadResponse)
async def upload_video(
    file: UploadFile,
    request: Request,
    user: CurrentUser = Depends(require_patient),
) -> UploadResponse:
    db = get_db()
    await enforce_upload_quota(user.id)
    document, stored_path = await save_local_video_upload(file, patient_id=user.id)
    try:
        await db.uploads.insert_one(document)
    except Exception:
        stored_path.unlink(missing_ok=True)
        raise
    await audit_event(
        action="upload.video",
        outcome="success",
        request=request,
        actor=user,
        resource_type="upload",
        resource_id=document["uploadId"],
        patient_id=user.id,
    )
    return UploadResponse(
        uploadId=document["uploadId"],
        fileId=document["uploadId"],
        originalFileName=document["originalFileName"],
        fileName=document["fileName"],
        contentType=document["contentType"],
        sizeBytes=document["sizeBytes"],
    )


@router.post("/video/{file_id}/playback-token", response_model=PlaybackTokenResponse)
async def create_video_playback_token(
    file_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> PlaybackTokenResponse:
    db = get_db()
    upload = await db.uploads.find_one({"$or": [{"uploadId": file_id}, {"fileId": file_id}]})
    if not upload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")
    require_patient_access(user, upload["patientId"])
    upload_id = upload.get("uploadId") or upload.get("fileId")
    token, expires_at = create_playback_token(actor=user, upload_id=upload_id, patient_id=upload["patientId"])
    base_url = str(request.url_for("stream_video", file_id=upload_id))
    await audit_event(
        action="upload.playback_token",
        outcome="success",
        request=request,
        actor=user,
        resource_type="upload",
        resource_id=upload_id,
        patient_id=upload["patientId"],
    )
    return PlaybackTokenResponse(videoUrl=f"{base_url}?videoToken={quote(token)}", expiresAt=expires_at)


def parse_range_header(range_header: str, file_size: int) -> tuple[int, int]:
    if not range_header.startswith("bytes="):
        raise ValueError("Invalid range unit")

    range_str = range_header.split("=")[1].strip()
    if not range_str:
        raise ValueError("Empty range")

    if "," in range_str:
        range_str = range_str.split(",")[0].strip()

    parts = range_str.split("-")
    if len(parts) != 2:
        raise ValueError("Invalid range format")

    start_str, end_str = parts[0].strip(), parts[1].strip()
    if not start_str and not end_str:
        raise ValueError("Invalid range values")

    if not start_str:
        suffix_len = int(end_str)
        if suffix_len <= 0:
            raise ValueError("Suffix length must be positive")
        start = max(0, file_size - suffix_len)
        end = file_size - 1
    elif not end_str:
        start = int(start_str)
        end = file_size - 1
    else:
        start = int(start_str)
        end = int(end_str)

    if start < 0:
        start = 0
    if start >= file_size or end >= file_size or start > end:
        raise ValueError("Range unsatisfiable")

    return start, end


def send_bytes_range(path: Path, start: int, end: int, chunk_size: int = 1024 * 1024):
    with open(path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            to_read = min(chunk_size, remaining)
            data = f.read(to_read)
            if not data:
                break
            yield data
            remaining -= len(data)


def sanitize_filename(filename: str | None) -> str:
    if not filename:
        return "movement-video"
    return "".join(char if char.isalnum() or char in {" ", ".", "_", "-"} else "_" for char in filename)[:120]


def user_from_video_credentials(
    *,
    authorization: str | None,
    video_token: str | None,
    upload_id: str,
) -> CurrentUser | dict:
    if authorization and authorization.startswith("Bearer "):
        payload = verify_signed_token(authorization.removeprefix("Bearer ").strip(), "access")
        return payload
    if video_token:
        payload = verify_signed_token(video_token, "video_playback")
        token_upload_id = payload.get("uploadId") or payload.get("fileId")
        if token_upload_id != upload_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Video token does not match this file.")
        return CurrentUser(
            id=str(payload.get("sub") or ""),
            public_id=str(payload.get("publicId") or payload.get("sub") or "").upper(),
            role=str(payload.get("role") or ""),
            display_name=str(payload.get("publicId") or payload.get("sub") or "").upper(),
        )
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing video credentials.")


@router.get("/video/{file_id}", name="stream_video")
async def stream_video(
    file_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
    video_token: str | None = Query(default=None, alias="videoToken"),
    range: str | None = Header(default=None),
):
    db = get_db()
    upload = await db.uploads.find_one({"$or": [{"uploadId": file_id}, {"fileId": file_id}]})
    if not upload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    user_or_payload = user_from_video_credentials(authorization=authorization, video_token=video_token, upload_id=upload.get("uploadId") or file_id)
    if isinstance(user_or_payload, dict):
        user = await user_from_access_payload(user_or_payload)
    else:
        user = user_or_payload
    if video_token:
        token_payload = verify_signed_token(video_token, "video_playback")
        if token_payload.get("patientId") != upload.get("patientId"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Video token patient mismatch.")
    else:
        require_patient_access(user, upload["patientId"])

    path = resolve_local_storage_path(upload["objectKey"])
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file missing on disk.")

    await audit_event(
        action="upload.stream_video",
        outcome="success",
        request=request,
        actor=user,
        resource_type="upload",
        resource_id=upload.get("uploadId") or file_id,
        patient_id=upload["patientId"],
    )

    file_size = path.stat().st_size
    media_type = upload.get("contentType") or "video/mp4"
    filename = sanitize_filename(upload.get("fileName"))

    if range:
        try:
            start, end = parse_range_header(range, file_size)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
                detail=str(exc),
                headers={"Content-Range": f"bytes */{file_size}", **SENSITIVE_HEADERS},
            ) from exc

        headers = {
            **SENSITIVE_HEADERS,
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
            "Content-Type": media_type,
            "Content-Disposition": f'inline; filename="{filename}"',
        }
        return StreamingResponse(
            send_bytes_range(path, start, end),
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            headers=headers,
            media_type=media_type,
        )

    headers = {
        **SENSITIVE_HEADERS,
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": media_type,
        "Content-Disposition": f'inline; filename="{filename}"',
    }
    return StreamingResponse(
        send_bytes_range(path, 0, file_size - 1),
        status_code=status.HTTP_200_OK,
        headers=headers,
        media_type=media_type,
    )
