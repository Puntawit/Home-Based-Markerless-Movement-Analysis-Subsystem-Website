from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.common import new_uuid, utc_now

DEFAULT_TASKS: list[dict[str, Any]] = [
    {
        "code": "hip_flexion",
        "name": "Hip Flexion",
        "shortName": "Hip Flexion",
        "category": "lower_limb_rom",
        "bodyParts": ["hip"],
        "defaultView": "side",
        "durationSeconds": 8,
        "description": {
            "patientInstruction": "Raise your thigh toward your chest while seated.",
            "doctorPurpose": "Check hip flexion range of motion.",
            "setupInstruction": "Keep the full trunk and leg visible from the side.",
            "safetyNote": None,
        },
        "symptomQuestions": [],
        "analysisConfig": {"movementType": "hip_flexion", "requiredView": "side"},
    },
    {
        "code": "hip_extension",
        "name": "Hip Extension",
        "shortName": "Hip Extension",
        "category": "lower_limb_rom",
        "bodyParts": ["hip"],
        "defaultView": "side",
        "durationSeconds": 8,
        "description": {
            "patientInstruction": "Lift the straight leg backward while lying prone.",
            "doctorPurpose": "Check hip extension range of motion.",
            "setupInstruction": "Record the full leg from the side.",
            "safetyNote": None,
        },
        "symptomQuestions": [],
        "analysisConfig": {"movementType": "hip_extension", "requiredView": "side"},
    },
    {
        "code": "knee_flexion",
        "name": "Knee Flexion",
        "shortName": "Knee Flexion",
        "category": "lower_limb_rom",
        "bodyParts": ["knee"],
        "defaultView": "side",
        "durationSeconds": 8,
        "description": {
            "patientInstruction": "Bend your knee while seated near the edge of the chair.",
            "doctorPurpose": "Check knee flexion range of motion.",
            "setupInstruction": "Keep thigh and lower leg visible from the side.",
            "safetyNote": None,
        },
        "symptomQuestions": [],
        "analysisConfig": {"movementType": "knee_flexion", "requiredView": "side"},
    },
    {
        "code": "knee_extension",
        "name": "Knee Extension",
        "shortName": "Knee Extension",
        "category": "lower_limb_rom",
        "bodyParts": ["knee"],
        "defaultView": "side",
        "durationSeconds": 8,
        "description": {
            "patientInstruction": "Straighten your knee from the seated position.",
            "doctorPurpose": "Check knee extension range of motion.",
            "setupInstruction": "Keep thigh and lower leg visible from the side.",
            "safetyNote": None,
        },
        "symptomQuestions": [],
        "analysisConfig": {"movementType": "knee_extension", "requiredView": "side"},
    },
    {
        "code": "ankle_dorsiflexion",
        "name": "Ankle Dorsiflexion",
        "shortName": "Ankle Dorsiflexion",
        "category": "lower_limb_rom",
        "bodyParts": ["ankle"],
        "defaultView": "side",
        "durationSeconds": 8,
        "description": {
            "patientInstruction": "Pull your toes upward while keeping your heel down.",
            "doctorPurpose": "Check ankle dorsiflexion range of motion.",
            "setupInstruction": "Keep the lower leg and foot visible from the side.",
            "safetyNote": None,
        },
        "symptomQuestions": [],
        "analysisConfig": {"movementType": "ankle_dorsiflexion", "requiredView": "side"},
    },
    {
        "code": "ankle_plantarflexion",
        "name": "Ankle Plantarflexion",
        "shortName": "Ankle Plantarflexion",
        "category": "lower_limb_rom",
        "bodyParts": ["ankle"],
        "defaultView": "side",
        "durationSeconds": 8,
        "description": {
            "patientInstruction": "Point your toes downward while seated.",
            "doctorPurpose": "Check ankle plantarflexion range of motion.",
            "setupInstruction": "Keep the lower leg and foot visible from the side.",
            "safetyNote": None,
        },
        "symptomQuestions": [],
        "analysisConfig": {"movementType": "ankle_plantarflexion", "requiredView": "side"},
    },
]


async def seed_default_tasks(db: AsyncIOMotorDatabase) -> None:
    now = utc_now()
    for item in DEFAULT_TASKS:
        existing = await db.tasks.find_one({"code": item["code"]})
        if existing:
            continue
        await db.tasks.insert_one(
            {
                "taskId": new_uuid(),
                "code": item["code"],
                "name": item["name"],
                "shortName": item["shortName"],
                "category": item["category"],
                "bodyParts": item["bodyParts"],
                "defaultView": item["defaultView"],
                "durationSeconds": item["durationSeconds"],
                "tutorialVideo": {},
                "description": item["description"],
                "symptomQuestions": item["symptomQuestions"],
                "analysisConfig": item["analysisConfig"],
                "isActive": True,
                "version": 1,
                "createdAt": now,
                "updatedAt": now,
            }
        )


async def list_active_tasks(db: AsyncIOMotorDatabase) -> list[dict[str, Any]]:
    return await db.tasks.find({"isActive": True}, sort=[("category", 1), ("createdAt", 1)]).to_list(length=100)


async def find_task_by_id(db: AsyncIOMotorDatabase, task_id: str) -> dict[str, Any] | None:
    return await db.tasks.find_one({"taskId": task_id})


async def find_task_by_code(db: AsyncIOMotorDatabase, code: str) -> dict[str, Any] | None:
    return await db.tasks.find_one({"code": code})
