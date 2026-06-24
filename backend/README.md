# Movement Analysis Backend

FastAPI backend for the Movement Analysis Subsystem. This service connects:

- patient video upload and session submission
- doctor review and feedback
- external MediaPipe service at `POST /api/movement/assess`
- MongoDB metadata storage
- local dev video storage in `backend/uploads/`

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
UPLOAD_DIR=backend/uploads
FRONTEND_ORIGIN=http://localhost:5173
MEDIAPIPE_SERVICE_URL=http://127.0.0.1:8000
```

## Mock Auth

Patient:

```http
POST /auth/mock-login
```

```json
{ "role": "patient" }
```

Doctor:

```json
{ "role": "doctor" }
```

Use the returned token in:

```text
Authorization: Bearer <accessToken>
```

## Core Flow

1. Patient uploads a video with `POST /uploads/video`.
2. Patient saves a task with `POST /patient/sessions/draft/tasks/{movement_type}` using the returned `fileId`.
3. After all 4 movement tasks are recorded, patient submits with `POST /patient/sessions/submit`.
4. Backend creates an analysis job and calls MediaPipe once per task video.
5. Doctor reviews sessions from `GET /doctor/sessions`.
6. Doctor sends feedback with `POST /doctor/sessions/{session_id}/feedback`.
7. Patient reads the latest feedback from `GET /patient/feedback/latest`.

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

The full MediaPipe response is stored as `rawPayload`, then mapped into `doctorView`.
