# Backend V1 MediaPipe Integration Progress

## Changed Files

- `backend/`
  - Added a new FastAPI backend service for patient sessions, uploads, doctor review, feedback, and MediaPipe orchestration.
  - Uses MongoDB for metadata and local dev file storage under `backend/uploads/`.
  - Includes mock bearer-token authentication for one demo patient and one demo doctor.

- `backend/README.md`
  - Documents how to run the backend, configure environment variables, use mock auth, and understand the core flow.

- `backend/.env.example`
  - Documents MongoDB, upload directory, frontend origin, and MediaPipe service settings.

- `progress-backend-v1-mediapipe-integration.md`
  - Tracks this backend implementation pass.

- `src/lib/backendApi.ts`
  - Added a shared frontend backend client with separate patient/doctor mock-token storage and backend video URL helper.

- `src/features/patient/api/patientApi.ts`
  - Replaced the in-memory patient mock API with backend calls for login, draft session, upload, save task, submit, latest session, and feedback.

- `src/features/patient/pages/PatientRecordPage.tsx`
  - Sends the selected video `File` into the save-task mutation so the API can upload it and bind the returned `fileId`.

- `src/features/doctor/api/doctorApi.ts`
  - Added frontend adapter that loads backend doctor sessions and maps `doctorView` data into the existing dashboard shape.

- `src/features/doctor/pages/DoctorDashboardPage.tsx`
  - Loads doctor sessions from the backend, plays uploaded videos when available, and posts structured feedback to the backend.

- `src/features/patient/types/patient.types.ts`
  - Added backend session statuses and optional backend IDs/file fields.

- `src/features/patient/components/LatestSessionCard.tsx`
  - Added labels for backend analysis statuses.

- `src/features/patient/pages/PatientStatusPage.tsx`
  - Reads backend analysis statuses when showing the processing steps.

## Current Progress

- Implemented the backend API surface from the plan:
  - `POST /auth/mock-login`
  - `GET /patients/me`
  - `POST /uploads/video`
  - `GET /uploads/video/{file_id}`
  - `GET /patient/sessions/draft`
  - `POST /patient/sessions/draft/tasks/{movement_type}`
  - `POST /patient/sessions/submit`
  - `GET /patient/sessions/latest`
  - `GET /patient/feedback/latest`
  - `GET /doctor/sessions`
  - `GET /doctor/sessions/{session_id}`
  - `POST /doctor/sessions/{session_id}/feedback`
  - `GET /analysis/jobs/{job_id}`

- Implemented MediaPipe adapter behavior:
  - Calls `POST {MEDIAPIPE_SERVICE_URL}/api/movement/assess`.
  - Sends `patient_id`, `task_type`, `view`, and video file as multipart data.
  - Maps MediaPipe `rawPayload` into `doctorView`.
  - Converts `front`, `side`, and `front_and_side` into MediaPipe view labels.
- Updated `.gitignore` so Python virtual environments, Python cache folders, and local uploaded videos are not committed.
- Wired the current React patient flow to backend endpoints for mock login, upload, save task, submit session, latest session, and latest feedback.
- Wired the doctor dashboard to fetch backend sessions, show backend video playback URLs, and submit feedback.
- Added query-token support for video playback because browser `<video>` elements cannot attach an `Authorization` header directly.

## Validation

- Ran Python compile validation for the backend app.
- Imported `app.main:app` successfully through `uv run`.
- Ran `npm.cmd run build` successfully.
- Did not run a live `/health` server check because that requires a running MongoDB service in this environment.

## What Remains To Be Done

- Run the backend with a local MongoDB instance.
- Run the MediaPipe service and validate one full 4-video session manually.
- Add fuller automated tests later when requested.
