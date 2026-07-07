from app.schemas import MovementType

MOVEMENT_TYPES: list[MovementType] = [
    "hip_flexion",
    "hip_extension",
    "knee_flexion",
    "knee_extension",
    "ankle_dorsiflexion",
    "ankle_plantarflexion",
]

TASK_LABELS = {
    "hip_flexion": "Hip Flexion",
    "hip_extension": "Hip Extension",
    "knee_flexion": "Knee Flexion",
    "knee_extension": "Knee Extension",
    "ankle_dorsiflexion": "Ankle Dorsiflexion",
    "ankle_plantarflexion": "Ankle Plantarflexion",
    "gait_walk": "Gait Walk",
    "sit_to_stand": "Sit to Stand",
    "single_leg_stance": "Single Leg Stance",
    "shoulder_flexion": "Shoulder Flexion",
    "stair_task": "Stair Task",
}


def create_empty_tasks() -> list[dict]:
    return [
        {
            "taskId": f"task-draft-{movement_type}",
            "movementType": movement_type,
            "taskLabel": TASK_LABELS[movement_type],
            "status": "not_started",
            "analysisStatus": "not_started",
        }
        for movement_type in MOVEMENT_TYPES
    ]


def uses_active_task_protocol(tasks: list[dict]) -> bool:
    movement_types = [task.get("movementType") for task in tasks]
    return movement_types == MOVEMENT_TYPES


def all_tasks_recorded(tasks: list[dict]) -> bool:
    return bool(tasks) and all(task.get("status") == "recorded" and task.get("fileId") for task in tasks)
