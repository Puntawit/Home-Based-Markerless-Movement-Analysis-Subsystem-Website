from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm"}


def validate_video_file(file: UploadFile) -> str:
    original_name = file.filename or "movement-video"
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload an MP4, MOV, or WEBM video.",
        )
    return suffix


async def save_upload_file(file: UploadFile) -> tuple[str, Path, int]:
    suffix = validate_video_file(file)
    settings = get_settings()
    settings.upload_path.mkdir(parents=True, exist_ok=True)

    file_id = f"file_{uuid4().hex}"
    stored_path = settings.upload_path / f"{file_id}{suffix}"

    size = 0
    with stored_path.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            buffer.write(chunk)

    return file_id, stored_path, size
