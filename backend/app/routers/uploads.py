from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.core.auth import MOCK_USERS, CurrentUser, require_patient
from app.db.mongo import get_db
from app.schemas import UploadResponse
from app.services.sessions import utc_now
from app.services.uploads import save_upload_file

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/video", response_model=UploadResponse)
async def upload_video(file: UploadFile, user: CurrentUser = Depends(require_patient)) -> UploadResponse:
    db = get_db()
    file_id, stored_path, size = await save_upload_file(file)
    document = {
        "fileId": file_id,
        "patientId": user.id,
        "fileName": file.filename or stored_path.name,
        "contentType": file.content_type or "application/octet-stream",
        "sizeBytes": size,
        "path": str(stored_path),
        "createdAt": utc_now(),
    }
    await db.uploads.insert_one(document)
    return UploadResponse(
        fileId=file_id,
        fileName=document["fileName"],
        contentType=document["contentType"],
        sizeBytes=size,
    )


@router.get("/video/{file_id}")
async def stream_video(
    file_id: str,
    authorization: str | None = Header(default=None),
    token: str | None = Query(default=None),
) -> FileResponse:
    raw_token = token
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.removeprefix("Bearer ").strip()
    user = MOCK_USERS.get(raw_token or "")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid video token.")

    db = get_db()
    upload = await db.uploads.find_one({"fileId": file_id})
    if not upload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    if user.role == "patient" and upload.get("patientId") != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Video access denied.")

    path = Path(upload["path"])
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file missing on disk.")

    return FileResponse(path, media_type=upload.get("contentType") or "video/mp4", filename=upload.get("fileName"))
