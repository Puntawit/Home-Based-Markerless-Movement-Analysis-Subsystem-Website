from typing import Any

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.services.common import new_uuid, utc_now


def normalize_public_id(value: str) -> str:
    return value.strip().upper()


def build_demo_users() -> list[dict[str, Any]]:
    from app.core.auth import hash_password  # local import: core.auth imports this module

    settings = get_settings()
    now = utc_now()
    users: list[dict[str, Any]] = []
    # Empty in production, so seeded users get no usable password and are
    # refused at login until an operator provisions one.
    seed_hash = hash_password(settings.demo_login_password) if settings.demo_login_password else None

    for public_id in sorted(settings.demo_patient_ids):
        assigned_doctor = None
        for doctor_public_id, patient_ids in settings.doctor_patient_assignments.items():
            if public_id in patient_ids:
                assigned_doctor = doctor_public_id
                break
        users.append(
            {
                "userId": new_uuid(),
                "publicId": public_id,
                "role": "patient",
                "name": public_id,
                "email": None,
                "phone": None,
                "passwordHash": seed_hash,
                "mustChangePassword": False,
                "passwordUpdatedAt": now if seed_hash else None,
                "status": "active",
                "assignedDoctorId": assigned_doctor,
                "profile": {"age": None, "gender": None, "specialty": None},
                "createdAt": now,
                "updatedAt": now,
            }
        )

    for public_id in sorted(settings.demo_doctor_ids):
        users.append(
            {
                "userId": new_uuid(),
                "publicId": public_id,
                "role": "doctor",
                "name": "Dr. Demo" if public_id == "DOCTOR-DEMO" else public_id,
                "email": None,
                "phone": None,
                "passwordHash": seed_hash,
                "mustChangePassword": False,
                "passwordUpdatedAt": now if seed_hash else None,
                "status": "active",
                "assignedDoctorId": None,
                "profile": {"age": None, "gender": None, "specialty": "Rehabilitation"},
                "createdAt": now,
                "updatedAt": now,
            }
        )

    for public_id in sorted(settings.demo_admin_ids):
        users.append(
            {
                "userId": new_uuid(),
                "publicId": public_id,
                "role": "admin",
                "name": "Admin",
                "email": None,
                "phone": None,
                # Deliberately no seeded hash: the admin authenticates against
                # ADMIN_PASSWORD_HASH until an operator sets a real one, which keeps
                # the bootstrap path exercised on every fresh database.
                "passwordHash": None,
                "mustChangePassword": False,
                "passwordUpdatedAt": None,
                "status": "active",
                "assignedDoctorId": None,
                "profile": {"age": None, "gender": None, "specialty": None},
                "createdAt": now,
                "updatedAt": now,
            }
        )

    return users


async def seed_default_users(db: AsyncIOMotorDatabase) -> None:
    existing = await db.users.count_documents({})
    if existing:
        await backfill_demo_user_assignments(db)
        return

    users = build_demo_users()
    if users:
        await db.users.insert_many(users)
    await backfill_demo_user_assignments(db)


async def backfill_demo_user_assignments(db: AsyncIOMotorDatabase) -> None:
    settings = get_settings()
    for doctor_public_id, patient_public_ids in settings.doctor_patient_assignments.items():
        doctor = await find_user_by_public_id(db, doctor_public_id)
        if not doctor:
            continue
        await db.users.update_many(
            {"publicId": {"$in": sorted(patient_public_ids)}, "role": "patient"},
            {"$set": {"assignedDoctorId": doctor["userId"], "updatedAt": utc_now()}},
        )


async def migrate_admin_users_if_needed(db: AsyncIOMotorDatabase) -> None:
    cursor = db.admin_users.find({})
    async for document in cursor:
        public_id = normalize_public_id(str(document.get("userId") or ""))
        if not public_id:
            continue
        existing = await find_user_by_public_id(db, public_id)
        if existing:
            continue
        role = str(document.get("role") or "patient")
        now = utc_now()
        assigned_doctor_public_id = normalize_public_id(str(document.get("assignedDoctorId") or "")) if document.get("assignedDoctorId") else None
        assigned_doctor = await find_user_by_public_id(db, assigned_doctor_public_id) if assigned_doctor_public_id else None
        await db.users.insert_one(
            {
                "userId": new_uuid(),
                "publicId": public_id,
                "role": role,
                "name": document.get("name") or public_id,
                "email": document.get("email"),
                "phone": document.get("phone"),
                # Migrated users have no credential; an operator must set one via
                # scripts/manage_auth.py before they can log in.
                "passwordHash": None,
                "mustChangePassword": True,
                "passwordUpdatedAt": None,
                "status": "inactive" if document.get("status") == "inactive" else "active",
                "assignedDoctorId": assigned_doctor["userId"] if assigned_doctor else assigned_doctor_public_id,
                "profile": {
                    "age": document.get("age"),
                    "gender": document.get("gender"),
                    "specialty": document.get("specialty"),
                },
                "createdAt": document.get("createdAt") or now,
                "updatedAt": document.get("updatedAt") or now,
                "legacy": {"adminStatus": document.get("status"), "riskLevel": document.get("riskLevel")},
            }
        )


async def find_user_by_user_id(db: AsyncIOMotorDatabase, user_id: str) -> dict[str, Any] | None:
    return await db.users.find_one({"userId": user_id})


async def find_user_by_public_id(db: AsyncIOMotorDatabase, public_id: str | None) -> dict[str, Any] | None:
    if not public_id:
        return None
    return await db.users.find_one({"publicId": normalize_public_id(public_id)})


async def find_user_for_reference(db: AsyncIOMotorDatabase, identifier: str | None) -> dict[str, Any] | None:
    if not identifier:
        return None
    return await find_user_by_user_id(db, identifier) or await find_user_by_public_id(db, identifier)


async def require_active_user(db: AsyncIOMotorDatabase, *, role: str, identifier: str) -> dict[str, Any]:
    user = await find_user_for_reference(db, identifier)
    if not user or user.get("role") != role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    if user.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive.")
    return user


async def set_user_password(
    db: AsyncIOMotorDatabase,
    *,
    identifier: str,
    password: str,
    must_change: bool = True,
) -> dict[str, Any]:
    from app.core.auth import hash_password, validate_password_policy  # local import: avoids cycle

    validate_password_policy(password)
    user = await find_user_for_reference(db, identifier)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    now = utc_now()
    await db.users.update_one(
        {"userId": user["userId"]},
        {
            "$set": {
                "passwordHash": hash_password(password),
                "mustChangePassword": must_change,
                "passwordUpdatedAt": now,
                "updatedAt": now,
            }
        },
    )
    return user


async def get_assigned_patients_for_doctor(db: AsyncIOMotorDatabase, doctor_user_id: str) -> list[dict[str, Any]]:
    return await db.users.find({"role": "patient", "assignedDoctorId": doctor_user_id, "status": "active"}).to_list(length=1000)
