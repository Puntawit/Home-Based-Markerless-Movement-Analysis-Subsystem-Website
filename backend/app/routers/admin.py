from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, create_playback_token, get_current_user
from app.core.config import get_settings
from app.db.mongo import get_db
from app.schemas import (
    AdminAuditEventSummary,
    AdminDemoUsers,
    AdminOverviewResponse,
    AdminPatientRecentAssessment,
    AdminPatientsResponse,
    AdminPatientsStats,
    AdminPatientSummary,
    AdminServiceHealth,
    AdminUploadStats,
    AdminUserCounts,
    AdminCreateUserRequest,
    AdminFeedbackSummary,
    AdminMediaPipePayloadSummary,
    AdminUserDetailResponse,
    AdminUserSummary,
    AdminUsersResponse,
    AdminVideoSummary,
)
from app.services.audit import audit_event
from app.services.sessions import new_id, public_doc, utc_now

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin_with_audit(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    await ensure_admin_or_audit(
        action="admin.overview",
        request=request,
        resource_type="admin_overview",
        user=user,
    )
    return user


async def ensure_admin_or_audit(
    *,
    action: str,
    request: Request,
    resource_type: str,
    user: CurrentUser,
) -> None:
    if user.role != "admin":
        await audit_event(
            action=action,
            outcome="denied",
            request=request,
            actor=user,
            resource_type=resource_type,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required.")


async def count_by_field(collection: str, field: str) -> dict[str, int]:
    db = get_db()
    cursor = db[collection].aggregate(
        [
            {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
            {"$match": {"_id": {"$ne": None}}},
        ]
    )
    return {str(item["_id"]): int(item["count"]) async for item in cursor}


async def distinct_values(collection: str, field: str) -> set[str]:
    values = await get_db()[collection].distinct(field)
    return {str(value).upper() for value in values if value}


async def get_upload_stats() -> AdminUploadStats:
    db = get_db()
    result = await db.uploads.aggregate(
        [
            {
                "$group": {
                    "_id": None,
                    "totalUploads": {"$sum": 1},
                    "totalSizeBytes": {"$sum": {"$ifNull": ["$sizeBytes", 0]}},
                }
            }
        ]
    ).to_list(length=1)

    if not result:
        return AdminUploadStats(totalUploads=0, totalSizeBytes=0)
    return AdminUploadStats(
        totalUploads=int(result[0].get("totalUploads", 0)),
        totalSizeBytes=int(result[0].get("totalSizeBytes", 0)),
    )


async def get_user_counts() -> AdminUserCounts:
    patients: set[str] = set()
    for collection in ("sessions", "uploads", "feedback", "analysis_jobs"):
        patients.update(await distinct_values(collection, "patientId"))

    doctors = await distinct_values("feedback", "doctorId")
    doctors.update(await distinct_values("audit_events", "actorId"))
    doctors = {doctor for doctor in doctors if doctor.startswith("DOCTOR")}

    admins = await distinct_values("audit_events", "actorId")
    admins = {admin for admin in admins if admin.startswith("ADMIN")}

    return AdminUserCounts(
        total=len(patients) + len(doctors) + len(admins),
        patients=len(patients),
        doctors=len(doctors),
        admins=len(admins),
    )


async def get_audit_event_counts() -> dict[str, dict[str, int] | int]:
    db = get_db()
    total = await db.audit_events.count_documents({})
    return {
        "total": total,
        "byOutcome": await count_by_field("audit_events", "outcome"),
        "byActorRole": await count_by_field("audit_events", "actorRole"),
        "byAction": await count_by_field("audit_events", "action"),
    }


def to_audit_summary(document: dict[str, Any]) -> AdminAuditEventSummary:
    timestamp = document.get("timestamp")
    if hasattr(timestamp, "isoformat"):
        timestamp = timestamp.isoformat().replace("+00:00", "Z")

    return AdminAuditEventSummary(
        eventId=str(document.get("eventId") or ""),
        timestamp=str(timestamp or ""),
        actorRole=document.get("actorRole"),
        action=str(document.get("action") or ""),
        outcome=str(document.get("outcome") or ""),
    )


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def humanize_identifier(value: str | None, fallback: str) -> str:
    if not value:
        return fallback
    return value.replace("_", " ").replace("-", " ").title()


def initials_for(name: str, fallback_id: str) -> str:
    words = [word for word in name.replace("-", " ").replace("_", " ").split() if word]
    if len(words) >= 2:
        return f"{words[0][0]}{words[1][0]}".upper()
    source = words[0] if words else fallback_id
    return source[:2].upper()


def iso_string(value: Any) -> str | None:
    if not value:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat().replace("+00:00", "Z")
    return str(value)


def get_latest_time(session: dict[str, Any]) -> str | None:
    return session.get("submittedAt") or session.get("updatedAt") or session.get("createdAt")


def risk_rank(risk_level: str | None) -> int:
    return {"unknown": 0, "low": 1, "moderate": 2, "high": 3}.get(str(risk_level or "unknown"), 0)


def risk_from_session(session: dict[str, Any] | None, analysis_results: dict[str, dict[str, Any]]) -> str:
    if not session:
        return "unknown"
    highest = "unknown"
    for task in session.get("tasks", []):
        result_id = task.get("analysisResultId")
        result = analysis_results.get(result_id) if result_id else None
        risk_level = result.get("doctorView", {}).get("riskLevel") if result else None
        if risk_rank(risk_level) > risk_rank(highest):
            highest = risk_level
    return highest


def score_from_session(session: dict[str, Any] | None, analysis_results: dict[str, dict[str, Any]]) -> int | None:
    if not session:
        return None
    scores = []
    for task in session.get("tasks", []):
        result_id = task.get("analysisResultId")
        result = analysis_results.get(result_id) if result_id else None
        score = result.get("doctorView", {}).get("qualityScore") if result else None
        if isinstance(score, (int, float)):
            scores.append(float(score))
    if not scores:
        return None
    return round(sum(scores) / len(scores))


def get_assigned_doctor(patient_id: str, feedback: dict[str, Any] | None) -> tuple[str | None, str | None]:
    if feedback and feedback.get("doctorId"):
        doctor_id = str(feedback.get("doctorId"))
        return doctor_id, str(feedback.get("doctorName") or humanize_identifier(doctor_id, "Assigned Doctor"))

    for doctor_id, patient_ids in get_settings().doctor_patient_assignments.items():
        if patient_id.upper() in patient_ids:
            return doctor_id, humanize_identifier(doctor_id, "Assigned Doctor")
    return None, None


def recent_assessments_from_session(
    session: dict[str, Any] | None,
    analysis_results: dict[str, dict[str, Any]],
) -> list[AdminPatientRecentAssessment]:
    if not session:
        return []
    assessment_date = get_latest_time(session)
    assessments = []
    for task in session.get("tasks", [])[:4]:
        result_id = task.get("analysisResultId")
        result = analysis_results.get(result_id) if result_id else None
        score = result.get("doctorView", {}).get("qualityScore") if result else None
        assessments.append(
            AdminPatientRecentAssessment(
                label=str(task.get("taskLabel") or task.get("movementType") or "Movement Assessment"),
                date=assessment_date,
                score=round(score) if isinstance(score, (int, float)) else None,
            )
        )
    return assessments


def admin_user_id(role: str, requested_id: str | None) -> str:
    if requested_id and requested_id.strip():
        return requested_id.strip().upper()
    prefix = "PATIENT" if role == "patient" else "DOCTOR"
    return new_id(prefix).replace("_", "-").upper()


def user_status_from_session(session: dict[str, Any] | None, risk_level: str) -> str:
    if risk_level in {"high", "moderate"}:
        return "at_risk"
    last_time = parse_datetime(get_latest_time(session) if session else None)
    if last_time and last_time >= datetime.now(timezone.utc) - timedelta(days=30):
        return "active"
    return "inactive"


def summary_from_admin_doc(document: dict[str, Any]) -> AdminUserSummary:
    role = str(document.get("role") or "patient")
    name = str(document.get("name") or document.get("userId") or "Unknown User")
    subtitle = document.get("specialty")
    if role == "patient":
        demographics = [str(document.get("gender") or "").strip(), str(document.get("age") or "").strip()]
        subtitle = ", ".join(item for item in demographics if item) or document.get("email") or document.get("phone")

    return AdminUserSummary(
        id=str(document.get("userId") or "").upper(),
        role="doctor" if role == "doctor" else "patient",
        name=name,
        subtitle=subtitle,
        assignedLabel=document.get("assignedDoctorId") if role == "patient" else None,
        lastSessionAt=iso_string(document.get("lastSessionAt")),
        status=document.get("status") or "inactive",
        riskLevel=document.get("riskLevel") or "unknown",
    )


def summary_from_patient(
    patient_id: str,
    session: dict[str, Any] | None,
    analysis_results: dict[str, dict[str, Any]],
    admin_doc: dict[str, Any] | None,
) -> AdminUserSummary:
    risk_level = risk_from_session(session, analysis_results)
    name = str(admin_doc.get("name") if admin_doc else session.get("patientName") if session else patient_id)
    subtitle = None
    if admin_doc:
        demographics = [str(admin_doc.get("gender") or "").strip(), str(admin_doc.get("age") or "").strip()]
        subtitle = ", ".join(item for item in demographics if item) or admin_doc.get("email") or admin_doc.get("phone")
    return AdminUserSummary(
        id=patient_id,
        role="patient",
        name=name,
        subtitle=subtitle,
        assignedLabel=admin_doc.get("assignedDoctorId") if admin_doc else get_assigned_doctor(patient_id, None)[1],
        lastSessionAt=iso_string(get_latest_time(session) if session else admin_doc.get("createdAt") if admin_doc else None),
        status=user_status_from_session(session, risk_level),
        riskLevel=risk_level,
    )


def summary_from_doctor(doctor_id: str, admin_doc: dict[str, Any] | None, feedback: dict[str, Any] | None) -> AdminUserSummary:
    name = str(admin_doc.get("name") if admin_doc else feedback.get("doctorName") if feedback else humanize_identifier(doctor_id, doctor_id))
    return AdminUserSummary(
        id=doctor_id,
        role="doctor",
        name=name,
        subtitle=admin_doc.get("specialty") if admin_doc else "Clinical reviewer",
        assignedLabel=None,
        lastSessionAt=iso_string(feedback.get("createdAt") if feedback else admin_doc.get("createdAt") if admin_doc else None),
        status="active" if feedback or admin_doc else "inactive",
        riskLevel="unknown",
    )


async def get_latest_feedback_by_patient(patient_ids: set[str]) -> dict[str, dict[str, Any]]:
    latest_feedback: dict[str, dict[str, Any]] = {}
    if not patient_ids:
        return latest_feedback

    cursor = get_db().feedback.find({"patientId": {"$in": sorted(patient_ids)}}).sort("createdAt", -1)
    async for feedback in cursor:
        patient_id = str(feedback.get("patientId") or "").upper()
        if patient_id and patient_id not in latest_feedback:
            latest_feedback[patient_id] = feedback
    return latest_feedback


async def get_analysis_results_by_id(result_ids: set[str]) -> dict[str, dict[str, Any]]:
    if not result_ids:
        return {}

    cursor = get_db().analysis_results.find({"analysisResultId": {"$in": sorted(result_ids)}})
    return {
        str(document.get("analysisResultId")): document
        async for document in cursor
        if document.get("analysisResultId")
    }


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    request: Request,
    user: CurrentUser = Depends(require_admin_with_audit),
) -> AdminOverviewResponse:
    db = get_db()
    settings = get_settings()

    session_counts = await count_by_field("sessions", "status")
    analysis_job_counts = await count_by_field("analysis_jobs", "status")
    feedback_count = await db.feedback.count_documents({})
    recent_audit_docs = await db.audit_events.find(
        {},
        {"eventId": 1, "timestamp": 1, "actorRole": 1, "action": 1, "outcome": 1},
    ).sort("timestamp", -1).limit(8).to_list(length=8)

    overview = AdminOverviewResponse(
        userCounts=await get_user_counts(),
        envConfiguredDemoUsers=AdminDemoUsers(
            patients=sorted(settings.demo_patient_ids),
            doctors=sorted(settings.demo_doctor_ids),
            admins=sorted(settings.demo_admin_ids),
        ),
        sessionCounts=session_counts,
        uploadStats=await get_upload_stats(),
        analysisJobCounts=analysis_job_counts,
        feedbackCount=feedback_count,
        auditEventCounts=await get_audit_event_counts(),
        serviceHealth=AdminServiceHealth(
            backend="ok",
            mongodb="ok",
            mediapipeConfigured=bool(settings.mediapipe_service_url),
            mediapipeServiceUrl=settings.mediapipe_service_url or None,
        ),
        recentAuditEvents=[to_audit_summary(document) for document in recent_audit_docs],
    )

    await audit_event(
        action="admin.overview",
        outcome="success",
        request=request,
        actor=user,
        resource_type="admin_overview",
        details={"containsPatientLevelAggregates": True},
    )
    return overview


@router.get("/patients", response_model=AdminPatientsResponse)
async def get_admin_patients(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> AdminPatientsResponse:
    await ensure_admin_or_audit(
        action="admin.list_patients",
        request=request,
        resource_type="admin_patients",
        user=user,
    )

    db = get_db()
    settings = get_settings()
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    sessions = await db.sessions.find(
        {},
        sort=[("submittedAt", -1), ("updatedAt", -1), ("createdAt", -1)],
    ).to_list(length=1000)

    patient_ids = {str(patient_id).upper() for patient_id in settings.demo_patient_ids}
    latest_session_by_patient: dict[str, dict[str, Any]] = {}
    result_ids: set[str] = set()

    for session in sessions:
        patient_id = str(session.get("patientId") or "").upper()
        if not patient_id:
            continue
        patient_ids.add(patient_id)
        latest_session_by_patient.setdefault(patient_id, session)
        for task in session.get("tasks", []):
            result_id = task.get("analysisResultId")
            if result_id:
                result_ids.add(str(result_id))

    latest_feedback_by_patient = await get_latest_feedback_by_patient(patient_ids)
    analysis_results = await get_analysis_results_by_id(result_ids)

    patients: list[AdminPatientSummary] = []
    for patient_id in sorted(patient_ids):
        latest_session = latest_session_by_patient.get(patient_id)
        latest_feedback = latest_feedback_by_patient.get(patient_id)
        last_assessment_at = get_latest_time(latest_session) if latest_session else None
        last_assessment_time = parse_datetime(last_assessment_at)
        patient_name = str(latest_session.get("patientName") or patient_id) if latest_session else patient_id
        assigned_doctor_id, assigned_doctor_name = get_assigned_doctor(patient_id, latest_feedback)

        patients.append(
            AdminPatientSummary(
                patientId=patient_id,
                patientName=patient_name,
                initials=initials_for(patient_name, patient_id),
                status="active" if last_assessment_time and last_assessment_time >= thirty_days_ago else "inactive",
                riskLevel=risk_from_session(latest_session, analysis_results),
                riskScore=score_from_session(latest_session, analysis_results),
                assignedDoctorId=assigned_doctor_id,
                assignedDoctorName=assigned_doctor_name,
                nextAppointmentAt=None,
                lastAssessmentAt=last_assessment_at,
                latestSessionId=str(latest_session.get("sessionId")) if latest_session else None,
                recentAssessments=recent_assessments_from_session(latest_session, analysis_results),
            )
        )

    assessments_last_30_days = 0
    completed_assessments = 0
    for session in sessions:
        submitted_at = parse_datetime(get_latest_time(session))
        if submitted_at and submitted_at >= thirty_days_ago:
            assessments_last_30_days += 1
        if session.get("status") == "feedback_ready":
            completed_assessments += 1

    stats = AdminPatientsStats(
        totalPatients=len(patients),
        activePatients=sum(1 for patient in patients if patient.status == "active"),
        highRiskPatients=sum(1 for patient in patients if patient.riskLevel == "high"),
        assessmentsLast30Days=assessments_last_30_days,
        completedAssessments=completed_assessments,
    )

    await audit_event(
        action="admin.list_patients",
        outcome="success",
        request=request,
        actor=user,
        resource_type="admin_patients",
        details={"containsPatientLevelRecords": True, "patientCount": len(patients)},
    )
    return AdminPatientsResponse(stats=stats, patients=patients)


async def collect_admin_user_context() -> tuple[
    dict[str, dict[str, Any]],
    dict[str, dict[str, Any]],
    dict[str, dict[str, Any]],
    dict[str, dict[str, Any]],
]:
    db = get_db()
    sessions = await db.sessions.find({}, sort=[("submittedAt", -1), ("updatedAt", -1), ("createdAt", -1)]).to_list(length=1000)
    admin_docs = {
        str(document.get("userId") or "").upper(): document
        async for document in db.admin_users.find({})
        if document.get("userId")
    }

    latest_session_by_patient: dict[str, dict[str, Any]] = {}
    result_ids: set[str] = set()
    for session in sessions:
        patient_id = str(session.get("patientId") or "").upper()
        if patient_id:
            latest_session_by_patient.setdefault(patient_id, session)
        for task in session.get("tasks", []):
            result_id = task.get("analysisResultId")
            if result_id:
                result_ids.add(str(result_id))

    latest_feedback_by_doctor: dict[str, dict[str, Any]] = {}
    cursor = db.feedback.find({}).sort("createdAt", -1)
    async for feedback in cursor:
        doctor_id = str(feedback.get("doctorId") or "").upper()
        if doctor_id and doctor_id not in latest_feedback_by_doctor:
            latest_feedback_by_doctor[doctor_id] = feedback

    analysis_results = await get_analysis_results_by_id(result_ids)
    return admin_docs, latest_session_by_patient, latest_feedback_by_doctor, analysis_results


@router.get("/users", response_model=AdminUsersResponse)
async def get_admin_users(request: Request, user: CurrentUser = Depends(get_current_user)) -> AdminUsersResponse:
    await ensure_admin_or_audit(
        action="admin.list_users",
        request=request,
        resource_type="admin_users",
        user=user,
    )

    settings = get_settings()
    admin_docs, latest_session_by_patient, latest_feedback_by_doctor, analysis_results = await collect_admin_user_context()

    patient_ids = {
        *settings.demo_patient_ids,
        *latest_session_by_patient.keys(),
        *(user_id for user_id, document in admin_docs.items() if document.get("role") == "patient"),
    }
    doctor_ids = {
        *settings.demo_doctor_ids,
        *latest_feedback_by_doctor.keys(),
        *(user_id for user_id, document in admin_docs.items() if document.get("role") == "doctor"),
    }

    users: list[AdminUserSummary] = []
    for patient_id in sorted(patient_ids):
        users.append(summary_from_patient(patient_id, latest_session_by_patient.get(patient_id), analysis_results, admin_docs.get(patient_id)))
    for doctor_id in sorted(doctor_ids):
        users.append(summary_from_doctor(doctor_id, admin_docs.get(doctor_id), latest_feedback_by_doctor.get(doctor_id)))

    users.sort(key=lambda item: (item.role != "patient", item.name.lower()))
    await audit_event(
        action="admin.list_users",
        outcome="success",
        request=request,
        actor=user,
        resource_type="admin_users",
        details={"userCount": len(users)},
    )
    return AdminUsersResponse(patientCount=len(patient_ids), doctorCount=len(doctor_ids), users=users)


@router.post("/users", response_model=AdminUserSummary, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    payload: AdminCreateUserRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> AdminUserSummary:
    await ensure_admin_or_audit(
        action="admin.create_user",
        request=request,
        resource_type="admin_user",
        user=user,
    )

    db = get_db()
    now = utc_now()
    user_id = admin_user_id(payload.role, payload.userId)
    existing = await db.admin_users.find_one({"userId": user_id})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User ID already exists.")

    document = {
        "userId": user_id,
        "role": payload.role,
        "name": payload.name.strip(),
        "specialty": payload.specialty,
        "age": payload.age,
        "gender": payload.gender,
        "email": payload.email,
        "phone": payload.phone,
        "assignedDoctorId": payload.assignedDoctorId.strip().upper() if payload.assignedDoctorId else None,
        "status": "active",
        "riskLevel": "unknown",
        "createdAt": now,
        "updatedAt": now,
    }
    if not document["name"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required.")

    await db.admin_users.insert_one(document)
    await audit_event(
        action="admin.create_user",
        outcome="success",
        request=request,
        actor=user,
        resource_type="admin_user",
        resource_id=user_id,
        details={"role": payload.role},
    )
    return summary_from_admin_doc(document)


def payload_preview(result: dict[str, Any] | None) -> AdminMediaPipePayloadSummary | None:
    if not result:
        return None
    raw_payload = result.get("rawPayload") or {}
    preview_payload = raw_payload if isinstance(raw_payload, dict) else {"rawPayload": raw_payload}
    if not preview_payload:
        preview_payload = {
            "doctorView": result.get("doctorView") or {},
            "metadata": {
                "analysisResultId": result.get("analysisResultId"),
                "mediaPipeSessionId": result.get("mediaPipeSessionId"),
            },
        }

    return AdminMediaPipePayloadSummary(
        analysisResultId=result.get("analysisResultId"),
        sessionId=result.get("sessionId"),
        taskId=result.get("taskId"),
        mediaPipeSessionId=result.get("mediaPipeSessionId"),
        payload=preview_payload,
    )


async def build_admin_videos(session: dict[str, Any] | None, user: CurrentUser, request: Request) -> list[AdminVideoSummary]:
    if not session:
        return []
    db = get_db()
    videos: list[AdminVideoSummary] = []
    patient_id = str(session.get("patientId") or "").upper()
    for task in session.get("tasks", []):
        file_id = task.get("fileId")
        if not file_id:
            continue
        upload = await db.uploads.find_one({"fileId": file_id})
        video_url = None
        if upload:
            token, _expires_at = create_playback_token(actor=user, file_id=file_id, patient_id=patient_id)
            video_url = f"{request.url_for('stream_video', file_id=file_id)}?videoToken={quote(token)}"
        result = task.get("analysisResult") or {}
        doctor_view = result.get("doctorView") or {}
        videos.append(
            AdminVideoSummary(
                taskId=str(task.get("taskId") or task.get("movementType") or file_id),
                sessionId=str(session.get("sessionId") or ""),
                title=str(task.get("taskLabel") or task.get("movementType") or "Movement video"),
                createdAt=iso_string(task.get("updatedAt") or get_latest_time(session)),
                sizeBytes=int(upload.get("sizeBytes") or 0) if upload else None,
                status=str(task.get("analysisStatus") or session.get("status") or "unknown"),
                riskLevel=doctor_view.get("riskLevel") or "unknown",
                videoUrl=video_url,
            )
        )
    return videos


@router.get("/users/{user_id}/detail", response_model=AdminUserDetailResponse)
async def get_admin_user_detail(
    user_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> AdminUserDetailResponse:
    await ensure_admin_or_audit(
        action="admin.get_user_detail",
        request=request,
        resource_type="admin_user_detail",
        user=user,
    )

    db = get_db()
    normalized_user_id = user_id.upper()
    admin_docs, latest_session_by_patient, latest_feedback_by_doctor, analysis_results = await collect_admin_user_context()
    admin_doc = admin_docs.get(normalized_user_id)
    role = admin_doc.get("role") if admin_doc else ("doctor" if normalized_user_id.startswith("DOCTOR") else "patient")

    if role == "doctor":
        summary = summary_from_doctor(normalized_user_id, admin_doc, latest_feedback_by_doctor.get(normalized_user_id))
        detail = AdminUserDetailResponse(user=summary)
    else:
        session = latest_session_by_patient.get(normalized_user_id)
        if session:
            session = public_doc(session)
            for task in session.get("tasks", []):
                result_id = task.get("analysisResultId")
                if result_id and result_id in analysis_results:
                    task["analysisResult"] = analysis_results[result_id]

        latest_feedback = await db.feedback.find_one({"patientId": normalized_user_id}, sort=[("createdAt", -1)])
        feedback_summary = None
        if latest_feedback:
            feedback_summary = AdminFeedbackSummary(
                feedbackId=str(latest_feedback.get("feedbackId") or ""),
                sessionId=str(latest_feedback.get("sessionId") or ""),
                doctorName=str(latest_feedback.get("doctorName") or latest_feedback.get("doctorId") or "Doctor"),
                clinicalSummary=str(latest_feedback.get("clinicalSummary") or ""),
                patientSummary=str(latest_feedback.get("patientSummary") or latest_feedback.get("summary") or ""),
                createdAt=iso_string(latest_feedback.get("createdAt")),
                riskLevel=risk_from_session(session, analysis_results),
                tags=[str(item.get("label") or item.get("movementType") or "Task note") for item in latest_feedback.get("taskNotes", [])[:3] if isinstance(item, dict)],
            )

        latest_result = None
        if session:
            for task in session.get("tasks", []):
                result = task.get("analysisResult")
                if result:
                    latest_result = result
                    break

        summary = summary_from_patient(normalized_user_id, session, analysis_results, admin_doc)
        detail = AdminUserDetailResponse(
            user=summary,
            videos=await build_admin_videos(session, user, request),
            latestFeedback=feedback_summary,
            mediaPipePayload=payload_preview(latest_result),
        )

    await audit_event(
        action="admin.get_user_detail",
        outcome="success",
        request=request,
        actor=user,
        resource_type="admin_user_detail",
        resource_id=normalized_user_id,
        patient_id=normalized_user_id if detail.user.role == "patient" else None,
        details={"containsVideoLinks": bool(detail.videos), "containsMediaPipePayload": detail.mediaPipePayload is not None},
    )
    return detail


@router.get("/analysis-results/{analysis_result_id}/payload")
async def get_admin_analysis_payload(
    analysis_result_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    await ensure_admin_or_audit(
        action="admin.export_mediapipe_payload",
        request=request,
        resource_type="analysis_result",
        user=user,
    )
    result = await get_db().analysis_results.find_one({"analysisResultId": analysis_result_id})
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis result not found.")
    await audit_event(
        action="admin.export_mediapipe_payload",
        outcome="success",
        request=request,
        actor=user,
        resource_type="analysis_result",
        resource_id=analysis_result_id,
        patient_id=result.get("patientId"),
    )
    return public_doc(result).get("rawPayload") or {}
