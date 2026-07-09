from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.services.common import new_uuid, utc_now
from app.services.uploads import validate_video_file, validate_video_signature


def build_object_key(*, patient_id: str, session_id: str | None, upload_id: str, suffix: str) -> str:
    session_segment = session_id or "unassigned"
    return f"patients/{patient_id}/sessions/{session_segment}/{upload_id}{suffix}"


def resolve_local_storage_path(object_key: str) -> Path:
    root = get_settings().upload_path.resolve()
    path = (root / object_key).resolve()
    if root != path and root not in path.parents:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unsafe storage path.")
    return path


async def save_local_video_upload(
    file: UploadFile,
    *,
    patient_id: str,
    session_id: str | None = None,
) -> tuple[dict, Path]:
    suffix = validate_video_file(file)
    settings = get_settings()
    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
    upload_id = new_uuid()
    object_key = build_object_key(patient_id=patient_id, session_id=session_id, upload_id=upload_id, suffix=suffix)
    stored_path = resolve_local_storage_path(object_key)
    stored_path.parent.mkdir(parents=True, exist_ok=True)

    size = 0
    try:
        with stored_path.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                if size == 0:
                    validate_video_signature(suffix, chunk)
                size += len(chunk)
                if size > max_size_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Video is larger than the {settings.max_upload_size_mb} MB demo upload limit.",
                    )
                buffer.write(chunk)
    except Exception:
        stored_path.unlink(missing_ok=True)
        raise

    if size == 0:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded video file is empty.")

    document = {
        "uploadId": upload_id,
        "patientId": patient_id,
        "sessionId": session_id,
        "sessionTaskId": None,
        "storageProvider": "local",
        "bucket": None,
        "objectKey": object_key.replace("\\", "/"),
        "originalFileName": file.filename or stored_path.name,
        "contentType": file.content_type or "application/octet-stream",
        "sizeBytes": size,
        "checksumSha256": None,
        "status": "uploaded",
        "createdAt": utc_now(),
        "updatedAt": utc_now(),
        "fileId": upload_id,
        "fileName": file.filename or stored_path.name,
        "path": str(stored_path),
    }
    return document, stored_path
