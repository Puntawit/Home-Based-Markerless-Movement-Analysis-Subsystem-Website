import asyncio
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings, validate_security_settings
from app.db.mongo import close_mongo_connection, connect_to_mongo
from app.routers import admin, analysis, auth, doctor, patient, patients, uploads
from app.schemas import HealthResponse
from app.services.analysis import recover_pending_analysis_jobs
from app.services.task_catalog import seed_default_tasks
from app.services.users import migrate_admin_users_if_needed, seed_default_users
from app.db.mongo import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    validate_security_settings(settings)
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    await connect_to_mongo()
    db = get_db()
    await seed_default_users(db)
    await migrate_admin_users_if_needed(db)
    await seed_default_tasks(db)
    if settings.recover_analysis_jobs_on_startup:
        asyncio.create_task(recover_pending_analysis_jobs())
    try:
        yield
    finally:
        await close_mongo_connection()


app = FastAPI(title="Movement Analysis Backend", version="0.1.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Range"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    request.state.request_id = request.headers.get("x-request-id") or f"req_{uuid4().hex}"
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith(("/uploads", "/patient", "/doctor", "/admin", "/analysis", "/auth")):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(uploads.router)
app.include_router(patient.router)
app.include_router(doctor.router)
app.include_router(admin.router)
app.include_router(analysis.router)
