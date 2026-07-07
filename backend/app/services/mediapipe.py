from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

VIEW_MAP = {
    "front": "frontal",
    "side": "lateral",
    "front_and_side": "frontal",
}


def to_percent(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return round(float(value) * 100)
    except (TypeError, ValueError):
        return None


def map_doctor_view(raw_payload: dict[str, Any]) -> dict[str, Any]:
    clinical = raw_payload.get("clinical_metrics", {})
    if not isinstance(clinical, dict):
        clinical = {}
    pose_quality = clinical.get("pose_quality", {})
    if not isinstance(pose_quality, dict):
        pose_quality = {}
    screening = raw_payload.get("screening_result", {})
    if not isinstance(screening, dict):
        screening = {}

    occlusion_warning = bool(pose_quality.get("occlusion_warning"))
    risk_level = screening.get("risk_level")
    if risk_level not in {"low", "moderate", "high"}:
        risk_level = "unknown"
    flags = screening.get("flags", [])
    if not isinstance(flags, list):
        flags = []

    metrics = []
    for group_name in ["joint_angles", "gait_parameters", "compensation", "smoothness"]:
        group = clinical.get(group_name, {})
        if isinstance(group, dict):
            for key, value in group.items():
                metrics.append({"group": group_name, "name": key, "value": value})

    symmetry = clinical.get("symmetry_index_score")
    if symmetry is not None:
        metrics.append({"group": "symmetry", "name": "symmetry_index_score", "value": symmetry})

    return {
        "riskLevel": risk_level,
        "confidence": to_percent(screening.get("confidence_score")),
        "qualityScore": to_percent(pose_quality.get("mean_keypoint_confidence")),
        "qualityIssues": ["occlusion_warning"] if occlusion_warning else [],
        "flags": flags,
        "metrics": metrics,
        "transformMatrix6dof": raw_payload.get("transformation_matrix_6dof"),
        "videoMetadata": raw_payload.get("video_metadata", {}),
    }


async def assess_video_with_mediapipe(
    *,
    patient_id: str,
    movement_type: str,
    view: str,
    file_path: Path,
    content_type: str,
) -> dict[str, Any]:
    settings = get_settings()
    url = f"{settings.mediapipe_service_url.rstrip('/')}/api/movement/assess"
    mapped_view = VIEW_MAP.get(view, view)
    headers = {"X-Internal-Service-Key": settings.mediapipe_api_key} if settings.mediapipe_api_key else None

    timeout = httpx.Timeout(settings.mediapipe_request_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        with file_path.open("rb") as video:
            try:
                response = await client.post(
                    url,
                    data={
                        "patient_id": patient_id,
                        "task_type": movement_type,
                        "view": mapped_view,
                    },
                    files={"file": (file_path.name, video, content_type)},
                    headers=headers,
                )
                response.raise_for_status()
                payload = response.json()
            except (httpx.HTTPError, ValueError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="MediaPipe service failed to process the movement video.",
                ) from exc

    validate_mediapipe_payload(payload)
    return payload


def validate_mediapipe_payload(payload: Any) -> None:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid MediaPipe response.")
    required = ["session_id", "video_metadata", "clinical_metrics", "screening_result", "transformation_matrix_6dof"]
    if any(field not in payload for field in required):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid MediaPipe response.")
    if not isinstance(payload.get("clinical_metrics"), dict) or not isinstance(payload.get("screening_result"), dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid MediaPipe response.")
