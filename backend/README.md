# Movement Analysis Backend

FastAPI backend for the Movement Analysis Subsystem demo. It supports doctor-assigned patient recording sessions, patient video upload, doctor review, feedback, MongoDB metadata storage, local demo video storage, and MediaPipe orchestration.

The backend now writes toward the newer domain schema with `users`, `tasks`, `sessions.sessionTasks`, `uploads.uploadId`, and `sessions.analysis`. Compatibility aliases such as `fileId`, legacy `/analysis/jobs/...`, and legacy `tasks` in session responses are still kept during migration.

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

## Auth And Access Control

All roles authenticate through one endpoint with a real password:

```http
POST /auth/login
```

```json
{ "identifier": "PATIENT-7712", "password": "...", "role": "patient" }
```

`identifier` is the user's `publicId` (or internal `userId`). The bootstrap admin
uses `ADMIN_USERNAME` as its identifier. `role` is optional and, when supplied,
must match the account.

Use the returned signed JWT in:

```text
Authorization: Bearer <accessToken>
```

Change a password (requires a valid token):

```http
POST /auth/change-password
{ "currentPassword": "...", "newPassword": "..." }
```

The credential-free `POST /auth/mock-login` and the separate `POST /auth/admin-login`
have been removed.

### Rules worth knowing

- **The app refuses to start** if `AUTH_SECRET_KEY` is unset, still the shipped
  default, or shorter than 32 characters. There is no override flag.
- Wrong password, unknown user, and "no password set" all return an identical
  `401 Invalid credentials.` The real reason is written to `audit_events` only.
- A user whose `passwordHash` is `null` can never log in. Seeded and migrated
  users start this way on purpose.
- After `MAX_FAILED_LOGINS` (default 5) failures an account is locked for
  `LOCKOUT_MINUTES` (default 15). Tracked per identifier and per client IP in the
  `login_attempts` collection.
- Passwords are PBKDF2-SHA256 with `PBKDF2_ITERATIONS` (default 600000). The
  iteration count is embedded in each hash, so raising it does not invalidate
  existing passwords.
- `DEMO_LOGIN_PASSWORD` seeds demo patient/doctor passwords for dev and E2E. Leave
  it **empty in production** — seeded users then have no usable password.

### Provisioning credentials

Admins create users with a temporary password (generated if not supplied, and
returned exactly once); the user is forced to change it at first login.

For a fresh or legacy database where every `passwordHash` is `null`, bootstrap with
the operator CLI:

```bash
# Generate a hash for ADMIN_PASSWORD_HASH
uv run python -m scripts.manage_auth hash-password

# Set an existing user's password directly
uv run python -m scripts.manage_auth set-password --identifier PATIENT-7712
```

The bootstrap admin authenticates against `ADMIN_PASSWORD_HASH` until a real hash
exists on its user document, so an operator can always get in to provision others.

Doctor access to a patient is enforced through patient `assignedDoctorId`. Never
commit plaintext passwords.

## Admin Overview

The read-only admin dashboard uses:

```http
GET /admin/overview
Authorization: Bearer <admin accessToken>
```

This endpoint returns aggregate user counts, session status counts, upload totals, session-analysis counts, feedback counts, audit event summaries, and backend/MongoDB/MediaPipe configuration health. User counts now come from `users`. Admin overview requests are audit logged because the response includes patient-level system aggregates.

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

The response contains a `videoUrl` with a short-lived `videoToken`. The stream endpoint also accepts a normal `Authorization` header for API clients. Upload records now use `uploadId` and storage metadata; `fileId` remains as a compatibility alias. Do not use local upload storage for real patient data.

## Core Flow

1. Doctor lists assigned patients with `GET /doctor/patients`.
2. Doctor creates a recording session with `POST /doctor/patients/{patient_id}/sessions`. The request selects active task codes and defaults in the frontend to all 6 lower-limb ROM tasks.
3. Patient loads the active assigned session with `GET /patient/sessions/active`. `GET /patient/sessions/draft` is kept as a compatibility alias but no longer auto-creates a session.
4. Patient uploads a video with `POST /uploads/video`.
5. Patient saves a task with `POST /patient/sessions/draft/tasks/{movement_type}` or `POST /patient/sessions/draft/session-tasks/{sessionTaskId}` using the returned `uploadId`.
6. After all assigned movement tasks are recorded, patient submits with `POST /patient/sessions/submit`.
7. Backend marks `sessions.analysis.status = queued` and calls MediaPipe once per session task video.
8. Doctor reviews sessions from `GET /doctor/sessions`, including active recording sessions and submitted analysis sessions.
9. Doctor can retry failed analysis with `POST /analysis/sessions/{session_id}/retry` or the legacy `POST /analysis/jobs/{job_id}/retry`.
10. Doctor sends feedback with `POST /doctor/sessions/{session_id}/feedback`.
11. Patient reads the latest feedback from `GET /patient/feedback/latest`.

Session status `assigned` means the doctor has created the session and the patient has not recorded any task yet. `assigned`, `draft`, and `ready_to_submit` are active recording states. A patient can have only one active recording session at a time; creating a second one returns `409 Conflict`.

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
- `GET /patient/sessions/active`
- `GET /doctor/patients`
- `POST /doctor/patients/{patient_id}/sessions`
- `POST /patient/sessions/draft/tasks/{movement_type}`
- `POST /patient/sessions/submit`
- `GET /patient/sessions/latest`
- `GET /patient/feedback/latest`
- `GET /doctor/sessions`
- `GET /doctor/sessions/{session_id}`
- `POST /doctor/sessions/{session_id}/feedback`
- `GET /analysis/jobs/{job_id}`
- `POST /analysis/jobs/{job_id}/retry`
- `POST /analysis/sessions/{session_id}/retry`

Flexible payloads are still allowed inside fields such as `quality`, `symptomReport`, `rawPayload`, and `metrics`, but session, task, feedback, compatibility job views, doctor view, and analysis result summaries have typed response shapes.

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
