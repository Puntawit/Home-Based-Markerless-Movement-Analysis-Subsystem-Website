# Movement Analysis Backend

FastAPI backend for the Movement Analysis Subsystem demo. It supports patient video upload, draft sessions, doctor review, feedback, MongoDB metadata storage, local demo video storage, and MediaPipe orchestration.

## Run Locally

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8001
```

Open:

```text
http://127.0.0.1:8001/docs
```

## Environment

Copy `.env.example` to `.env` and adjust values if needed.

```text
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=movement_analysis
UPLOAD_DIR=uploads
FRONTEND_ORIGIN=http://localhost:5173
MEDIAPIPE_SERVICE_URL=http://127.0.0.1:8000
MEDIAPIPE_API_KEY=
MEDIAPIPE_REQUEST_TIMEOUT_SECONDS=120
MAX_UPLOAD_SIZE_MB=200
AUTH_SECRET_KEY=change-this-demo-secret-before-sharing
ACCESS_TOKEN_TTL_MINUTES=60
PLAYBACK_TOKEN_TTL_MINUTES=5
DEMO_PATIENTS=PATIENT-7712
DEMO_DOCTORS=DOCTOR-DEMO
DEMO_ADMINS=ADMIN-DEMO
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=pbkdf2_sha256$390000$replace-with-random-salt$replace-with-password-hash
DEMO_DOCTOR_PATIENT_IDS=DOCTOR-DEMO:PATIENT-7712
MAX_UPLOADS_PER_PATIENT_PER_DAY=20
MAX_TOTAL_UPLOAD_MB_PER_PATIENT=2000
RECOVER_ANALYSIS_JOBS_ON_STARTUP=true
STORE_RAW_ANALYSIS_PAYLOAD=false
UPLOAD_RETENTION_DAYS=30
```

`UPLOAD_DIR=uploads` stores files in `backend/uploads/` when the server is run from the `backend/` directory.

## Demo Auth And Access Control

Patient login:

```http
POST /auth/mock-login
```

```json
{ "role": "patient" }
```

Doctor login:

```json
{ "role": "doctor" }
```

Admin login uses a username and password checked on the backend:

```http
POST /auth/admin-login
```

```json
{ "username": "admin", "password": "..." }
```

Use the returned signed demo JWT in:

```text
Authorization: Bearer <accessToken>
```

This is still demo-only auth, but tokens are now signed, expire, and are limited to patient/doctor/admin allowlists. Patient IDs must be listed in `DEMO_PATIENTS`. Doctor users can only see patients mapped in `DEMO_DOCTOR_PATIENT_IDS`. Admin passwords should be stored only as `ADMIN_PASSWORD_HASH` in local `.env`; do not commit plaintext passwords.

Old `mock-token-*` values are no longer accepted. Log in again after upgrading.

## Admin Overview

The read-only admin dashboard uses:

```http
GET /admin/overview
Authorization: Bearer <admin accessToken>
```

This endpoint returns aggregate user counts, session status counts, upload totals, analysis job counts, feedback counts, audit event summaries, and backend/MongoDB/MediaPipe configuration health. User counts are based on MongoDB-observed identities only; env-configured demo users are returned separately. Admin overview requests are audit logged because the response includes patient-level system aggregates.

The redesigned admin console also uses:

```http
GET /admin/users
POST /admin/users
GET /admin/users/{user_id}/detail
GET /admin/analysis-results/{analysis_result_id}/payload
Authorization: Bearer <admin accessToken>
```

These endpoints support patient/doctor counts, admin-created patient and doctor records, movement video review links, latest doctor feedback, and MediaPipe payload inspection/export. Patient-level admin access is audit logged.

## Secure Demo Video Playback

Browser `<video>` playback uses a short-lived playback token instead of putting the long-lived access token in the URL:

```http
POST /uploads/video/{file_id}/playback-token
Authorization: Bearer <accessToken>
```

The response contains a `videoUrl` with a short-lived `videoToken`. The stream endpoint also accepts a normal `Authorization` header for API clients. Do not use local upload storage for real patient data.

## Core Flow

1. Patient uploads a video with `POST /uploads/video`.
2. Patient saves a task with `POST /patient/sessions/draft/tasks/{movement_type}` using the returned `fileId`.
3. After all 6 lower-limb ROM movement tasks are recorded, patient submits with `POST /patient/sessions/submit`.
4. Backend creates an analysis job and calls MediaPipe once per task video.
5. Doctor reviews sessions from `GET /doctor/sessions`.
6. Doctor can retry failed analysis jobs with `POST /analysis/jobs/{job_id}/retry`.
7. Doctor sends feedback with `POST /doctor/sessions/{session_id}/feedback`.
8. Patient reads the latest feedback from `GET /patient/feedback/latest`.

Active lower-limb ROM movement tasks:

```text
hip_flexion
hip_extension
knee_flexion
knee_extension
ankle_dorsiflexion
ankle_plantarflexion
```

## Response Contract

The main demo endpoints now declare Pydantic response models so the frontend can rely on stable top-level shapes:

- `GET /patient/sessions/draft`
- `POST /patient/sessions/draft/tasks/{movement_type}`
- `POST /patient/sessions/submit`
- `GET /patient/sessions/latest`
- `GET /patient/feedback/latest`
- `GET /doctor/sessions`
- `GET /doctor/sessions/{session_id}`
- `POST /doctor/sessions/{session_id}/feedback`
- `GET /analysis/jobs/{job_id}`
- `POST /analysis/jobs/{job_id}/retry`

Flexible payloads are still allowed inside fields such as `quality`, `symptomReport`, `rawPayload`, and `metrics`, but session, task, feedback, analysis job, doctor view, and analysis result summaries have typed response shapes.

## Upload Validation

Video uploads are validated by extension and content type together:

```text
.mp4  -> video/mp4
.mov  -> video/quicktime or video/mov
.webm -> video/webm
```

The backend no longer accepts every `video/*` content type as a fallback. The max upload size limit and partial-file cleanup behavior remain unchanged.

## MediaPipe Integration

The backend calls:

```text
POST {MEDIAPIPE_SERVICE_URL}/api/movement/assess
```

as multipart form data:

```text
patient_id = session.patientId
task_type = task.movementType
view = frontal | lateral
file = video file
```

The MediaPipe response is validated before it is mapped into `doctorView`. By default, `STORE_RAW_ANALYSIS_PAYLOAD=false`, so the backend stores only the normalized doctor-facing view instead of keeping the full raw response payload. Set `MEDIAPIPE_API_KEY` on both services when the MediaPipe service supports internal service authentication.

## Audit Log

Security-relevant actions are written to the `audit_events` collection, including login, upload, playback-token generation, video stream access, patient submission, doctor session access, feedback submission, and analysis retry. The demo backend logs audit failures best-effort; production should fail closed or use a dedicated audit service.

## Reset Demo Data

This project previously used `backend/backend/uploads` in some local runs. For the hardening demo, use wipe-and-restart instead of migrating old demo files:

1. Drop or clear the MongoDB database named `movement_analysis`.
2. Delete local upload folders:

```text
backend/uploads
backend/backend/uploads
```

3. Start MongoDB, backend, MediaPipe, and frontend again.

Do not use local upload storage for real patient data.
