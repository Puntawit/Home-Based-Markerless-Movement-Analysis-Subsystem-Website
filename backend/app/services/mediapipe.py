from pathlib import Path
from typing import Any

import httpx

from app.core.config import get_settings

VIEW_MAP = {
    "front": "frontal",
    "side": "lateral",
    "front_and_side": "frontal",
}


def map_doctor_view(raw_payload: dict[str, Any]) -> dict[str, Any]:
    clinical = raw_payload.get("clinical_metrics", {})
    pose_quality = clinical.get("pose_quality", {})
    screening = raw_payload.get("screening_result", {})

    mean_confidence = pose_quality.get("mean_keypoint_confidence") or 0
    screening_confidence = screening.get("confidence_score") or 0
    occlusion_warning = bool(pose_quality.get("occlusion_warning"))

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
        "riskLevel": screening.get("risk_level", "low"),
        "confidence": round(float(screening_confidence) * 100),
        "qualityScore": round(float(mean_confidence) * 100),
        "qualityIssues": ["occlusion_warning"] if occlusion_warning else [],
        "flags": screening.get("flags", []),
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
) -> dict[str, Any]:
    settings = get_settings()
    url = f"{settings.mediapipe_service_url.rstrip('/')}/api/movement/assess"
    mapped_view = VIEW_MAP.get(view, view)

    timeout = httpx.Timeout(settings.mediapipe_request_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        with file_path.open("rb") as video:
            response = await client.post(
                url,
                data={
                    "patient_id": patient_id,
                    "task_type": movement_type,
                    "view": mapped_view,
                },
                files={"file": (file_path.name, video, "video/mp4")},
            )
    response.raise_for_status()
    return response.json()
