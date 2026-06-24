from app.schemas import MovementType

MOVEMENT_TYPES: list[MovementType] = [
    "gait_walk",
    "sit_to_stand",
    "single_leg_stance",
    "shoulder_flexion",
]

TASK_LABELS = {
    "gait_walk": "Gait Walk",
    "sit_to_stand": "Sit to Stand",
    "single_leg_stance": "Single Leg Stance",
    "shoulder_flexion": "Shoulder Flexion",
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


def all_tasks_recorded(tasks: list[dict]) -> bool:
    return all(task.get("status") == "recorded" and task.get("fileId") for task in tasks)
