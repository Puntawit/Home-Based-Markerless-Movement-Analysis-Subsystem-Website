from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.auth import CurrentUser, create_playback_token, get_current_user
from app.core.config import get_settings
from app.db.mongo import get_db
from app.schemas import (
    AdminAuditEventSummary,
    AdminCreateUserRequest,
    AdminDemoUsers,
    AdminFeedbackSummary,
    AdminMediaPipePayloadSummary,
    AdminOverviewResponse,
    AdminPatientRecentAssessment,
    AdminPatientsResponse,
    AdminPatientsStats,
    AdminPatientSummary,
    AdminServiceHealth,
    AdminUploadStats,
    AdminUserCounts,
    AdminUserDetailResponse,
    AdminUserSummary,
    AdminUsersResponse,
    AdminVideoSummary,
)
from app.services.audit import audit_event
from app.services.session_mapper import hydrate_session_document, public_doc
from app.services.sessions import utc_now
from app.services.users import find_user_for_reference, new_uuid

router = APIRouter(prefix="/admin", tags=["admin"])


async def ensure_admin_or_audit(*, action: str, request: Request, resource_type: str, user: CurrentUser) -> None:
    if user.role != "admin":
        await audit_event(action=action, outcome="denied", request=request, actor=user, resource_type=resource_type)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required.")


async def require_admin_with_audit(request: Request, user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    await ensure_admin_or_audit(action="admin.overview", request=request, resource_type="admin_overview", user=user)
    return user


def iso_string(value: Any) -> str | None:
    if not value:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat().replace("+00:00", "Z")
    return str(value)


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def get_latest_time(session: dict[str, Any] | None) -> str | None:
    if not session:
        return None
    return session.get("submittedAt") or session.get("updatedAt") or session.get("createdAt")


async def count_by_field(collection: str, field: str) -> dict[str, int]:
    cursor = get_db()[collection].aggregate([{"$group": {"_id": f"${field}", "count": {"$sum": 1}}}, {"$match": {"_id": {"$ne": None}}}])
    return {str(item["_id"]): int(item["count"]) async for item in cursor}


async def get_user_counts() -> AdminUserCounts:
    db = get_db()
    return AdminUserCounts(
        total=await db.users.count_documents({}),
        patients=await db.users.count_documents({"role": "patient"}),
        doctors=await db.users.count_documents({"role": "doctor"}),
        admins=await db.users.count_documents({"role": "admin"}),
    )


async def get_upload_stats() -> AdminUploadStats:
    result = await get_db().uploads.aggregate(
        [{"$group": {"_id": None, "totalUploads": {"$sum": 1}, "totalSizeBytes": {"$sum": {"$ifNull": ["$sizeBytes", 0]}}}}]
    ).to_list(length=1)
    if not result:
        return AdminUploadStats(totalUploads=0, totalSizeBytes=0)
    row = result[0]
    return AdminUploadStats(totalUploads=int(row.get("totalUploads", 0)), totalSizeBytes=int(row.get("totalSizeBytes", 0)))


async def get_audit_event_counts() -> dict[str, dict[str, int] | int]:
    db = get_db()
    return {
        "total": await db.audit_events.count_documents({}),
        "byOutcome": await count_by_field("audit_events", "outcome"),
        "byActorRole": await count_by_field("audit_events", "actorRole"),
        "byAction": await count_by_field("audit_events", "action"),
    }


def to_audit_summary(document: dict[str, Any]) -> AdminAuditEventSummary:
    return AdminAuditEventSummary(
        eventId=str(document.get("eventId") or ""),
        timestamp=iso_string(document.get("timestamp")) or "",
        actorRole=document.get("actorRole"),
        action=str(document.get("action") or ""),
        outcome=str(document.get("outcome") or ""),
    )


async def load_latest_sessions() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    db = get_db()
    latest_by_patient: dict[str, dict[str, Any]] = {}
    result_lookup: dict[str, dict[str, Any]] = {}
    sessions = await db.sessions.find({}, sort=[("submittedAt", -1), ("updatedAt", -1), ("createdAt", -1)]).to_list(length=1000)
    for raw_session in sessions:
        session = await hydrate_session_document(db, raw_session)
        patient_id = str(session.get("patientId") or "")
        if patient_id and patient_id not in latest_by_patient:
            latest_by_patient[patient_id] = session
        for task in session.get("sessionTasks", []):
            result_id = task.get("analysisResultId")
            if result_id and result_id not in result_lookup:
                result = await db.analysis_results.find_one({"analysisResultId": result_id})
                if result:
                    result_lookup[result_id] = public_doc(result)
    return latest_by_patient, result_lookup


def risk_rank(value: str | None) -> int:
    return {"unknown": 0, "low": 1, "moderate": 2, "high": 3}.get(str(value or "unknown"), 0)


def risk_from_session(session: dict[str, Any] | None, analysis_results: dict[str, dict[str, Any]]) -> str:
    highest = "unknown"
    for task in (session or {}).get("sessionTasks", []):
        result = analysis_results.get(task.get("analysisResultId"))
        risk_level = (result or {}).get("doctorView", {}).get("riskLevel")
        if risk_rank(risk_level) > risk_rank(highest):
            highest = str(risk_level)
    return highest


def score_from_session(session: dict[str, Any] | None, analysis_results: dict[str, dict[str, Any]]) -> int | None:
    scores: list[float] = []
    for task in (session or {}).get("sessionTasks", []):
        result = analysis_results.get(task.get("analysisResultId"))
        score = (result or {}).get("doctorView", {}).get("qualityScore")
        if isinstance(score, (int, float)):
            scores.append(float(score))
    return round(sum(scores) / len(scores)) if scores else None


async def assigned_doctor_summary(patient_user: dict[str, Any]) -> tuple[str | None, str | None]:
    if not patient_user.get("assignedDoctorId"):
        return None, None
    doctor = await find_user_for_reference(get_db(), patient_user.get("assignedDoctorId"))
    if not doctor:
        return str(patient_user.get("assignedDoctorId")), None
    return doctor["userId"], str(doctor.get("name") or doctor.get("publicId"))


def initials_for(name: str, fallback_id: str) -> str:
    words = [word for word in name.replace("-", " ").split() if word]
    if len(words) >= 2:
        return f"{words[0][0]}{words[1][0]}".upper()
    return (words[0] if words else fallback_id)[:2].upper()


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(request: Request, user: CurrentUser = Depends(require_admin_with_audit)) -> AdminOverviewResponse:
    db = get_db()
    settings = get_settings()
    recent = await db.audit_events.find({}, {"eventId": 1, "timestamp": 1, "actorRole": 1, "action": 1, "outcome": 1}).sort("timestamp", -1).limit(8).to_list(length=8)
    response = AdminOverviewResponse(
        userCounts=await get_user_counts(),
        envConfiguredDemoUsers=AdminDemoUsers(
            patients=sorted(settings.demo_patient_ids),
            doctors=sorted(settings.demo_doctor_ids),
            admins=sorted(settings.demo_admin_ids),
        ),
        sessionCounts=await count_by_field("sessions", "status"),
        uploadStats=await get_upload_stats(),
        analysisJobCounts=await count_by_field("sessions", "analysis.status"),
        feedbackCount=await db.feedback.count_documents({}),
        auditEventCounts=await get_audit_event_counts(),
        serviceHealth=AdminServiceHealth(
            backend="ok",
            mongodb="ok",
            mediapipeConfigured=bool(settings.mediapipe_service_url),
            mediapipeServiceUrl=settings.mediapipe_service_url or None,
        ),
        recentAuditEvents=[to_audit_summary(item) for item in recent],
    )
    await audit_event(action="admin.overview", outcome="success", request=request, actor=user, resource_type="admin_overview")
    return response


@router.get("/patients", response_model=AdminPatientsResponse)
async def get_admin_patients(request: Request, user: CurrentUser = Depends(get_current_user)) -> AdminPatientsResponse:
    await ensure_admin_or_audit(action="admin.list_patients", request=request, resource_type="admin_patients", user=user)
    db = get_db()
    latest_sessions, analysis_results = await load_latest_sessions()
    patient_users = await db.users.find({"role": "patient"}).to_list(length=1000)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    patients: list[AdminPatientSummary] = []

    for patient in patient_users:
        session = latest_sessions.get(patient["userId"])
        risk_level = risk_from_session(session, analysis_results)
        doctor_id, doctor_name = await assigned_doctor_summary(patient)
        last_assessment_at = get_latest_time(session)
        last_assessment_dt = parse_datetime(last_assessment_at)
        recent_assessments = [
            AdminPatientRecentAssessment(
                label=str(task.get("taskLabel") or task.get("taskCode") or "Movement Assessment"),
                date=last_assessment_at,
                score=(analysis_results.get(task.get("analysisResultId")) or {}).get("doctorView", {}).get("qualityScore"),
            )
            for task in (session or {}).get("sessionTasks", [])[:4]
        ]
        patients.append(
            AdminPatientSummary(
                patientId=patient["userId"],
                patientName=str(patient.get("name") or patient.get("publicId") or patient["userId"]),
                initials=initials_for(str(patient.get("name") or patient.get("publicId") or patient["userId"]), patient["userId"]),
                status="active" if last_assessment_dt and last_assessment_dt >= thirty_days_ago else "inactive",
                riskLevel=risk_level,
                riskScore=score_from_session(session, analysis_results),
                assignedDoctorId=doctor_id,
                assignedDoctorName=doctor_name,
                age=(patient.get("profile") or {}).get("age"),
                gender=(patient.get("profile") or {}).get("gender"),
                phone=patient.get("phone"),
                nextAppointmentAt=None,
                lastAssessmentAt=last_assessment_at,
                latestSessionId=(session or {}).get("sessionId"),
                recentAssessments=recent_assessments,
            )
        )

    sessions = list(latest_sessions.values())
    stats = AdminPatientsStats(
        totalPatients=len(patient_users),
        activePatients=sum(1 for item in patients if item.status == "active"),
        highRiskPatients=sum(1 for item in patients if item.riskLevel == "high"),
        assessmentsLast30Days=sum(1 for session in sessions if (parse_datetime(get_latest_time(session)) or datetime.min.replace(tzinfo=timezone.utc)) >= thirty_days_ago),
        completedAssessments=sum(1 for session in sessions if session.get("status") == "feedback_ready"),
    )
    await audit_event(action="admin.list_patients", outcome="success", request=request, actor=user, resource_type="admin_patients")
    return AdminPatientsResponse(stats=stats, patients=patients)


def user_summary_from_user(user_doc: dict[str, Any], latest_session: dict[str, Any] | None, risk_level: str) -> AdminUserSummary:
    role = "doctor" if user_doc.get("role") == "doctor" else "patient"
    profile = user_doc.get("profile") or {}
    subtitle = profile.get("specialty") if role == "doctor" else ", ".join(
        item for item in [str(profile.get("gender") or "").strip(), str(profile.get("age") or "").strip()] if item
    )
    return AdminUserSummary(
        id=str(user_doc.get("userId") or ""),
        role=role,
        name=str(user_doc.get("name") or user_doc.get("publicId") or user_doc.get("userId") or "Unknown User"),
        subtitle=subtitle or user_doc.get("email") or user_doc.get("phone"),
        assignedLabel=str(user_doc.get("assignedDoctorId")) if role == "patient" and user_doc.get("assignedDoctorId") else None,
        lastSessionAt=get_latest_time(latest_session),
        status="active" if user_doc.get("status") == "active" else "inactive",
        riskLevel=risk_level,
    )


@router.get("/users", response_model=AdminUsersResponse)
async def get_admin_users(request: Request, user: CurrentUser = Depends(get_current_user)) -> AdminUsersResponse:
    await ensure_admin_or_audit(action="admin.list_users", request=request, resource_type="admin_users", user=user)
    db = get_db()
    latest_sessions, analysis_results = await load_latest_sessions()
    users = await db.users.find({"role": {"$in": ["patient", "doctor"]}}).to_list(length=1000)
    summaries = [
        user_summary_from_user(user_doc, latest_sessions.get(user_doc["userId"]), risk_from_session(latest_sessions.get(user_doc["userId"]), analysis_results))
        for user_doc in users
    ]
    summaries.sort(key=lambda item: (item.role != "patient", item.name.lower()))
    await audit_event(action="admin.list_users", outcome="success", request=request, actor=user, resource_type="admin_users")
    return AdminUsersResponse(
        patientCount=sum(1 for item in summaries if item.role == "patient"),
        doctorCount=sum(1 for item in summaries if item.role == "doctor"),
        users=summaries,
    )


def generated_public_id(role: str, requested_id: str | None) -> str:
    if requested_id and requested_id.strip():
        return requested_id.strip().upper()
    prefix = "PATIENT" if role == "patient" else "DOCTOR" if role == "doctor" else "ADMIN"
    return f"{prefix}-{new_uuid().split('-')[0]}".upper()


@router.post("/users", response_model=AdminUserSummary, status_code=status.HTTP_201_CREATED)
async def create_admin_user(payload: AdminCreateUserRequest, request: Request, user: CurrentUser = Depends(get_current_user)) -> AdminUserSummary:
    await ensure_admin_or_audit(action="admin.create_user", request=request, resource_type="admin_user", user=user)
    db = get_db()
    public_id = generated_public_id(payload.role, payload.userId)
    if await db.users.find_one({"publicId": public_id}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User ID already exists.")
    assigned_doctor_id = None
    if payload.assignedDoctorId:
        assigned_doctor = await find_user_for_reference(db, payload.assignedDoctorId)
        assigned_doctor_id = assigned_doctor["userId"] if assigned_doctor else payload.assignedDoctorId
    document = {
        "userId": new_uuid(),
        "publicId": public_id,
        "role": payload.role,
        "name": payload.name.strip(),
        "email": payload.email,
        "phone": payload.phone,
        "passwordHash": None,
        "status": "active",
        "assignedDoctorId": assigned_doctor_id,
        "profile": {"age": payload.age, "gender": payload.gender, "specialty": payload.specialty},
        "createdAt": utc_now(),
        "updatedAt": utc_now(),
    }
    if not document["name"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required.")
    await db.users.insert_one(document)
    await audit_event(action="admin.create_user", outcome="success", request=request, actor=user, resource_type="admin_user", resource_id=document["userId"])
    return user_summary_from_user(document, None, "unknown")


def payload_preview(result: dict[str, Any] | None) -> AdminMediaPipePayloadSummary | None:
    if not result:
        return None
    payload = result.get("rawPayload") or {
        "doctorView": result.get("doctorView") or {},
        "metadata": {"analysisResultId": result.get("analysisResultId"), "mediaPipeSessionId": result.get("mediaPipeSessionId")},
    }
    return AdminMediaPipePayloadSummary(
        analysisResultId=result.get("analysisResultId"),
        sessionId=result.get("sessionId"),
        taskId=result.get("sessionTaskId") or result.get("taskId"),
        mediaPipeSessionId=result.get("mediaPipeSessionId"),
        payload=payload,
    )


async def build_admin_videos(session: dict[str, Any] | None, user: CurrentUser, request: Request) -> list[AdminVideoSummary]:
    if not session:
        return []
    db = get_db()
    videos: list[AdminVideoSummary] = []
    for task in session.get("sessionTasks", []):
        upload_id = task.get("uploadId")
        if not upload_id:
            continue
        upload = await db.uploads.find_one({"$or": [{"uploadId": upload_id}, {"fileId": upload_id}]})
        if not upload:
            continue
        token, _expires = create_playback_token(actor=user, upload_id=upload_id, patient_id=session["patientId"])
        result = await db.analysis_results.find_one({"analysisResultId": task.get("analysisResultId")}) if task.get("analysisResultId") else None
        risk_level = ((result or {}).get("doctorView") or {}).get("riskLevel") or "unknown"
        videos.append(
            AdminVideoSummary(
                taskId=str(task.get("sessionTaskId") or task.get("taskId") or upload_id),
                sessionId=str(session.get("sessionId") or ""),
                title=str(task.get("taskLabel") or task.get("taskCode") or "Movement video"),
                createdAt=task.get("updatedAt"),
                sizeBytes=int(upload.get("sizeBytes") or 0),
                status=str(task.get("analysisStatus") or "unknown"),
                riskLevel=risk_level,
                videoUrl=f"{request.url_for('stream_video', file_id=upload_id)}?videoToken={quote(token)}",
            )
        )
    return videos


@router.get("/users/{user_id}/detail", response_model=AdminUserDetailResponse)
async def get_admin_user_detail(user_id: str, request: Request, user: CurrentUser = Depends(get_current_user)) -> AdminUserDetailResponse:
    await ensure_admin_or_audit(action="admin.get_user_detail", request=request, resource_type="admin_user_detail", user=user)
    db = get_db()
    target = await find_user_for_reference(db, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    latest_sessions, analysis_results = await load_latest_sessions()
    if target["role"] == "doctor":
        summary = user_summary_from_user(target, None, "unknown")
        detail = AdminUserDetailResponse(user=summary)
    else:
        session = latest_sessions.get(target["userId"])
        latest_feedback = await db.feedback.find_one({"patientId": target["userId"]}, sort=[("createdAt", -1)])
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
                tags=[str(item.get("label") or item.get("taskCode") or item.get("movementType") or "Task note") for item in latest_feedback.get("taskNotes", [])[:3] if isinstance(item, dict)],
            )
        latest_result = None
        for task in (session or {}).get("sessionTasks", []):
            result_id = task.get("analysisResultId")
            if result_id and result_id in analysis_results:
                latest_result = analysis_results[result_id]
                break
        detail = AdminUserDetailResponse(
            user=user_summary_from_user(target, session, risk_from_session(session, analysis_results)),
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
        resource_id=target["userId"],
        patient_id=target["userId"] if target["role"] == "patient" else None,
    )
    return detail


@router.get("/analysis-results/{analysis_result_id}/payload")
async def get_admin_analysis_payload(analysis_result_id: str, request: Request, user: CurrentUser = Depends(get_current_user)) -> dict[str, Any]:
    await ensure_admin_or_audit(action="admin.export_mediapipe_payload", request=request, resource_type="analysis_result", user=user)
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
