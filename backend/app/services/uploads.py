from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

ALLOWED_CONTENT_TYPES = {
    ".mp4": {"video/mp4"},
    ".mov": {"video/quicktime", "video/mov"},
    ".webm": {"video/webm"},
}
ALLOWED_EXTENSIONS = set(ALLOWED_CONTENT_TYPES)


def validate_video_file(file: UploadFile) -> str:
    original_name = file.filename or "movement-video"
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported video extension. Supported pairs are .mp4 with video/mp4, .mov with video/quicktime or video/mov, and .webm with video/webm.",
        )
    content_type = (file.content_type or "").lower()
    allowed_types = ALLOWED_CONTENT_TYPES[suffix]
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported content type '{content_type or 'missing'}' for {suffix}. "
                "Supported pairs are .mp4 with video/mp4, .mov with video/quicktime or video/mov, and .webm with video/webm."
            ),
        )
    return suffix


def validate_video_signature(suffix: str, first_chunk: bytes) -> None:
    if not first_chunk:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded video file is empty.")
    if suffix in {".mp4", ".mov"} and b"ftyp" not in first_chunk[:32]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is not a valid MP4/MOV container.")
    if suffix == ".webm" and not first_chunk.startswith(b"\x1a\x45\xdf\xa3"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is not a valid WebM container.")


def ensure_safe_upload_path(path: Path) -> Path:
    upload_root = get_settings().upload_path.resolve()
    resolved = path.resolve()
    if upload_root != resolved and upload_root not in resolved.parents:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unsafe upload path.")
    return resolved


async def save_upload_file(file: UploadFile) -> tuple[str, Path, int]:
    suffix = validate_video_file(file)
    settings = get_settings()
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024

    file_id = f"file_{uuid4().hex}"
    stored_path = settings.upload_path / f"{file_id}{suffix}"

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

    return file_id, stored_path, size
