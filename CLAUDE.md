# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Movement Analysis Subsystem: a home-based markerless movement analysis / tele-rehabilitation prototype. Frontend is React/Vite/TypeScript in `src/`; backend is FastAPI/MongoDB in `backend/app/`. Active flow: a doctor creates/assigns a patient recording session, the patient records or uploads the assigned lower-limb ROM task videos, the patient submits the session, the backend runs MediaPipe analysis jobs, the doctor reviews results and sends feedback, and the patient reads that feedback. Admin monitors users/system data.

There is also a full `AGENTS.md` in the repo root with a detailed page/router/backend map, a "Common Change Map" (which files to touch together for a given kind of change), and a running work log of past changes — read it before non-trivial changes, especially when touching routing, session schema, or auth.

## Commands

Frontend (run from repo root):
- `npm install` — install dependencies
- `npm run dev` — start Vite dev server, `http://localhost:5173`
- `npm run build` — runs `tsc --noEmit` then `vite build`; this is the standard validation step for frontend changes
- `npm run preview` — preview the production build
- `npm run test:e2e` — runs `tests/e2e/run-e2e.mjs`, which spins up Docker Compose services (isolated MongoDB + fake MediaPipe), then runs Playwright against the real FastAPI backend and Vite frontend. Requires Docker Desktop/daemon running. `npx playwright test --list` can be used to sanity-check specs load without Docker.
- No Vitest/React Testing Library unit tests are configured yet — build + Playwright E2E are the only automated checks.

Backend (run from `backend/`):
- `uv sync` — install backend dependencies
- `uv run uvicorn app.main:app --reload --port 8001` — start backend, docs at `http://127.0.0.1:8001/docs`
- `uv run python -m compileall app` — quick syntax check when a full backend env (Mongo, deps) isn't available
- Requires MongoDB running locally (default `mongodb://localhost:27017`) and, for full analysis, a MediaPipe-compatible service at `MEDIAPIPE_SERVICE_URL` (default `http://127.0.0.1:8000`). Copy `backend/.env.example` to `backend/.env` first.

## Architecture

### Frontend routing and entry
- `src/main.tsx` → `AppProviders` (`src/app/providers.tsx`, sets up TanStack Query) → routes in `src/app/router.tsx`. Always check `router.tsx` first when adding/removing/redirecting pages.
- `src/lib/backendApi.ts` is the shared backend request wrapper: base URL (`VITE_BACKEND_URL`), auth token storage, expired-token handling, and secure video playback URL helper.
- `src/app/ProtectedRoute.tsx` + `useValidatedRoleSession.ts` validate saved tokens against `GET /auth/me` before rendering protected pages.
- `src/features/analysis/` and `src/features/dashboard/` are legacy prototype screens, **not wired into `router.tsx`** — don't assume they're live unless explicitly re-wired.

### Feature/role split
Frontend code is organized by role under `src/features/{patient,doctor,admin}/`, each with its own `api/`, `pages/`, `components/`, `data/`, and (patient) `types/`. Patient mobile-style layout lives in `src/features/patient/components/PatientLayout.tsx` / `MobileScreen.tsx`, separate from the desktop `src/components/layout/`.

- Patient flow: home (shows only the doctor-assigned active session, or an empty state) → tutorial → record (preflight/capture/review phases, webcam `MediaRecorder` with upload fallback) → submit → status (polls while analysis/review in progress) → feedback.
- Doctor flow: single dashboard (`DoctorDashboardPage.tsx`) — assigned patients/sessions, Add Session form (defaults to all 6 lower-limb ROM tasks), task review, risk flags/metrics, analysis retry, structured feedback submission.
- Admin flow: password login, then a dashboard/patients console for user management, video review links, feedback, and MediaPipe payload export.
- Movement task definitions (frontend) live in `src/features/patient/data/movementTasks.ts`; the backend mirror is `backend/app/services/movement_tasks.py`. Both must be edited together when task set/instructions change.

### Backend
- `backend/app/main.py`: app setup, CORS, security headers, router registration, Mongo lifecycle, pending-job recovery on startup.
- `backend/app/core/config.py`: env-driven settings, demo user allowlists, upload limits, JWT TTLs.
- `backend/app/core/auth.py`: signed access tokens, short-lived playback tokens, password verification, role/patient-access dependencies.
- `backend/app/db/mongo.py`: Mongo connection lifecycle, `get_db()`, and startup index creation (including safe handling of legacy indexes with conflicting options).
- `backend/app/schemas.py`: Pydantic contracts shared across routers.
- `backend/app/routers/`: thin route handlers per domain (`auth`, `uploads`, `patient`, `doctor`, `admin`, `analysis`, `patients`). Business logic belongs in `backend/app/services/`, not routers.
- Session model: a session moves through `assigned → draft → ready_to_submit → queued_analysis → processing_analysis → pending_doctor_review → feedback_ready`. `assigned`/`draft`/`ready_to_submit` are "active recording" states, and a patient can have only one active session at a time (creating a second returns `409`).
- The backend is mid-migration from demo-only collections toward a DB-backed schema (`users`, `tasks`, `sessions.sessionTasks`, `uploads.uploadId`, `sessions.analysis`) while keeping compatibility aliases (e.g. `fileId`, legacy `/analysis/jobs/...` routes, legacy `tasks` in session responses) for the current frontend. When changing schema, preserve these aliases unless the frontend mapping is updated in the same change.
- `services/mediapipe.py` calls `POST {MEDIAPIPE_SERVICE_URL}/api/movement/assess` (multipart: `patient_id`, `task_type`, `view`, `file`); response is validated and mapped into `doctorView`. `STORE_RAW_ANALYSIS_PAYLOAD=false` by default, so raw MediaPipe payloads aren't persisted.
- `services/audit.py` writes security-relevant events (login, upload, playback-token issuance, video stream access, submission, doctor access, feedback, analysis retry) to `audit_events`, best-effort (failures are logged, not fatal).

### Auth model (demo-grade, not production)
Role-based login (`POST /auth/mock-login` for patient/doctor by role, `POST /auth/admin-login` with username/password) issues signed JWTs resolved against DB-backed `users` (seeded from `DEMO_PATIENTS`/`DEMO_DOCTORS`/`DEMO_ADMINS`, UUID `userId` internally, human-readable `publicId` for compatibility). Doctor access to a patient is enforced via `assignedDoctorId`. Video playback uses short-lived playback tokens (`POST /uploads/video/{file_id}/playback-token`) rather than embedding the long-lived access token in URLs.

## Conventions

- Frontend: React functional components, TanStack Query, Tailwind. Components PascalCase, hooks `useSomething`, API helpers camelCase, files stay within the feature they serve.
- Backend: Python snake_case, Pydantic response models, dependency-injected auth, async Mongo via Motor.
- Keep endpoint response shapes stable within a change unless frontend types (`patient.types.ts`, `doctorApi.ts`, `adminApi.ts`, `schemas.py`) are updated together.
- Update `AGENTS.md`'s "Current Work Log" for non-trivial changes rather than creating new progress markdown files.

## Known issues / active gaps

- Some Thai text in older source/mock files is mojibake (encoding-corrupted); this has been partially but not fully cleaned up.
- No unit/component test framework configured yet (Vitest/RTL for frontend, pytest/httpx for backend are the intended future choices).
- Negative E2E cases (expired tokens, failed MediaPipe analysis, upload quota, validation failures) are not covered yet.
- Local upload storage (`backend/uploads/`) is demo-only and unsuitable for real patient data.
