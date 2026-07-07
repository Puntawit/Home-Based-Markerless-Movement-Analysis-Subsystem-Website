# Repository Guidelines

## Project Overview

This repository is a movement-analysis demo for home rehabilitation. The frontend is React/Vite/TypeScript in `src/`; the backend is FastAPI/MongoDB in `backend/app/`. The active product flow is: patient logs in, records or uploads 6 lower-limb ROM task videos, submits a session, backend runs MediaPipe analysis jobs, doctor reviews results and sends feedback, patient reads feedback, and admin monitors users/system data.

## Agent Workflow

Before changing code, read this file, then read the relevant Markdown docs such as `README.md`, `backend/README.md`, and `PROJECT_FLOW_FOR_AI.md`. After that, inspect the smallest set of source files needed for the task. Do not create new progress Markdown files for normal tasks; update the `Current Work Log` section here instead.

## Frontend Structure

- `src/main.tsx`: React entry point.
- `src/app/router.tsx`: all active browser routes. Start here when adding, removing, or redirecting pages.
- `src/app/providers.tsx`: app-level providers, especially TanStack Query.
- `src/lib/backendApi.ts`: shared backend request wrapper, base URL (`VITE_BACKEND_URL` fallback), auth token storage, expired-token helper, and secure video playback URL helper.
- `src/components/ui/`: reusable primitives such as `Button`, `Card`, `Badge`, `Input`, `Table`, `Tabs`, and loading/empty states.
- `src/components/layout/`: desktop-style layout pieces. Patient mobile-style layout is in `src/features/patient/components/PatientLayout.tsx` and `MobileScreen.tsx`.

## Frontend Pages And Where To Edit

Patient flow:

- `/patient/login` -> `src/features/patient/pages/PatientLoginPage.tsx`. Handles demo patient login through `mockLogin()` in `src/features/patient/api/patientApi.ts`.
- `/patient/home` -> `PatientHomePage.tsx`. Shows draft task progress, latest submitted session, latest feedback, and submit button. Edit this for patient dashboard/task list behavior.
- `/patient/tutorial?task=<task_id>` -> `PatientTutorialPage.tsx`. Reads task data from `src/features/patient/data/movementTasks.ts`. Edit this for task instructions, tutorial copy, or pre-record guidance.
- `/patient/record?task=<task_id>` -> `PatientRecordPage.tsx`. Handles webcam access, countdown, `MediaRecorder`, upload fallback, video preview, symptom report, quality checklist, and task saving.
- `/patient/status` -> `PatientStatusPage.tsx`. Displays analysis/review status after submission.
- `/patient/feedback` -> `PatientFeedbackPage.tsx`. Displays doctor feedback, retake requests, task notes, exercise plan, and follow-up plan.

Doctor flow:

- `/doctor/login` -> `src/features/doctor/pages/DoctorLoginPage.tsx`. Uses demo doctor login from `src/lib/backendApi.ts`.
- `/doctor/dashboard` -> `DoctorDashboardPage.tsx`. Shows backend-backed patient/session list, selected task video, risk flags, metrics, analysis retry, and feedback form. API mapping is in `src/features/doctor/api/doctorApi.ts`; mock type shapes still live in `src/features/doctor/data/doctor.mock.ts`.

Admin flow:

- `/admin/login` -> `src/features/admin/pages/AdminLoginPage.tsx`. Uses username/password backend login.
- `/admin/dashboard` -> `AdminDashboardPage.tsx`. Main admin console for patient/doctor user list, creating users, selected user detail, videos, feedback, and MediaPipe payload export.
- `/admin/patients` -> `AdminPatientsPage.tsx`. Patient overview table and aggregate stats.
- Admin API calls and TypeScript response types live in `src/features/admin/api/adminApi.ts`.

Legacy/prototype areas:

- `src/features/analysis/` and `src/features/dashboard/` contain older standalone analysis/dashboard UI. They are not active in `src/app/router.tsx` unless explicitly wired back in.

## Backend Structure

- `backend/app/main.py`: FastAPI app setup, CORS, security headers, health endpoint, router registration, Mongo startup/shutdown, and pending job recovery.
- `backend/app/core/config.py`: environment settings from `.env`, demo user allowlists, upload limits, MediaPipe URL, JWT TTLs, and auth config.
- `backend/app/core/auth.py`: signed access tokens, playback tokens, password verification, current-user dependencies, and role/patient-access checks.
- `backend/app/db/mongo.py`: MongoDB connection lifecycle and `get_db()`.
- `backend/app/schemas.py`: Pydantic request/response contracts shared by routers and frontend expectations.
- `backend/app/services/`: business logic helpers. Keep routers thin and put reusable workflow logic here.

## Backend Routers And Services

- `routers/auth.py`: `POST /auth/mock-login`, `POST /auth/admin-login`, and `GET /auth/me`. Edit for login behavior, demo users, or auth response shape.
- `routers/uploads.py`: `POST /uploads/video`, `POST /uploads/video/{file_id}/playback-token`, and `GET /uploads/video/{file_id}`. Edit for upload validation, quotas, local storage, streaming, and secure playback.
- `routers/patient.py`: draft session, save task, submit session, latest session, and latest feedback endpoints under `/patient`.
- `routers/doctor.py`: doctor session list/detail and feedback submission under `/doctor`.
- `routers/admin.py`: overview, patient/user admin lists, user creation, user detail, video links, latest feedback, and MediaPipe payload export under `/admin`.
- `routers/analysis.py`: analysis job lookup and doctor retry under `/analysis/jobs`.
- `routers/patients.py`: small patient profile endpoint `/patients/me`.
- `services/sessions.py`: session IDs, timestamps, draft session creation, status refresh, public Mongo doc cleanup.
- `services/movement_tasks.py`: active 6-task lower-limb ROM protocol. Edit this when changing required movement tasks.
- `services/uploads.py`: safe local upload path and file saving.
- `services/analysis.py`: analysis job execution, task result persistence, and session status transitions.
- `services/mediapipe.py`: HTTP integration to the external MediaPipe service.
- `services/audit.py`: audit event writing for security-relevant actions.

## Common Change Map

- Add/change a route: update `src/app/router.tsx`, then create or edit the page under the correct `src/features/<role>/pages/` folder.
- Change patient task names, required task count, instructions, or symptom questions: edit `src/features/patient/data/movementTasks.ts`, `backend/app/services/movement_tasks.py`, and related schemas/types if the shape changes.
- Change patient upload/record UX: edit `PatientRecordPage.tsx`, `UploadVideoBox.tsx`, `patientApi.ts`, and backend `routers/uploads.py` if server validation changes.
- Change session or feedback fields: update frontend types in `src/features/patient/types/patient.types.ts`, backend `schemas.py`, and the relevant API mapper in `patientApi.ts`, `doctorApi.ts`, or `adminApi.ts`.
- Change doctor review UI: start in `DoctorDashboardPage.tsx`; update `doctorApi.ts` if backend response mapping changes; update `routers/doctor.py` or `services/analysis.py` for server behavior.
- Change admin console data: start in `AdminDashboardPage.tsx` or `AdminPatientsPage.tsx`; update `adminApi.ts`, `routers/admin.py`, and `schemas.py` together.
- Change authentication or token expiration: edit `backend/app/core/auth.py`, `backend/app/core/config.py`, `routers/auth.py`, and `src/lib/backendApi.ts`.
- Change MediaPipe contract: edit `services/mediapipe.py`, `services/analysis.py`, `schemas.py`, and doctor/admin frontend mapping.

## Build, Test, And Development Commands

- `npm install`: install frontend dependencies.
- `npm run dev`: start Vite frontend, usually `http://localhost:5173`.
- `npm run build`: run TypeScript check with `tsc --noEmit` and build production assets.
- `npm run preview`: preview built frontend.
- `cd backend && uv sync`: install backend dependencies.
- `cd backend && uv run uvicorn app.main:app --reload --port 8001`: start backend at `http://127.0.0.1:8001/docs`.

Run MongoDB before backend work. Full analysis also expects the MediaPipe service at `MEDIAPIPE_SERVICE_URL`, default `http://127.0.0.1:8000`.

## Coding Style & Naming Conventions

Frontend uses React functional components, TypeScript, TanStack Query, and Tailwind CSS. Components are PascalCase, hooks are `useSomething`, API helpers are camelCase, and files should stay inside the feature they serve. Backend uses Python snake_case, Pydantic response models, dependency-based auth, and async MongoDB calls through Motor. Keep endpoint response shapes stable unless the frontend types are updated in the same task.

## Testing Guidelines

Minimum validation for frontend changes is `npm run build`. Hybrid happy-path E2E coverage is available through `npm run test:e2e`, which starts Docker compose dependencies for MongoDB and fake MediaPipe, then runs Playwright against the real FastAPI backend and Vite frontend. Full E2E requires Docker Desktop/daemon to be running. When adding unit tests later, prefer Vitest/React Testing Library for frontend behavior and pytest/httpx for FastAPI routes and services.

## Commit & Pull Request Guidelines

Recent commits use short imperative messages such as `add backend` and `edit video preview`. Keep commits focused. Pull requests should include a short summary, tested commands, linked issue/task if available, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Copy `backend/.env.example` to `backend/.env` for local setup. Do not commit real secrets, plaintext admin passwords, patient health data, raw videos, local upload folders, `.env`, `node_modules/`, `dist/`, or `.venv/`. Local upload storage is for demo only.

## Current Work Log

- Changed `src/features/patient/pages/PatientHomePage.tsx` and `src/features/doctor/pages/DoctorDashboardPage.tsx`: made the logout controls icon-only and more mobile-friendly, and reduced the prominence of the patient identifier text on small screens.
- Changed `AGENTS.md`: recorded the responsive logout button pass.
- Current progress: logout actions now take less horizontal space on small screens, and the patient header uses smaller username text on mobile.
- Remaining work: none for this task; `npm.cmd run build` should be rerun to verify the responsive button styles.

- Changed `src/features/patient/pages/PatientLoginPage.tsx` and `src/features/patient/pages/PatientHomePage.tsx`: rewrote the user-facing Thai copy to readable Thai, kept the centered login layout, and kept the patient logout button.
- Changed `src/features/doctor/pages/DoctorDashboardPage.tsx`: kept the logout button and switched the sign-out message to Thai.
- Changed `AGENTS.md`: recorded the Thai text cleanup pass.
- Current progress: the patient login and patient home screens now show readable Thai text again, and the doctor dashboard logout flow also uses Thai feedback.
- Remaining work: if you want, I can continue cleaning the older mojibake Thai text in other legacy screens; `npm.cmd run build` still passes after this pass.

- Changed `src/lib/backendApi.ts`: added role-aware auth token helpers plus `/auth/me` validation so the app can verify saved tokens before trusting them.
- Added `src/app/useValidatedRoleSession.ts`, `src/app/AuthLoadingScreen.tsx`, and `src/app/RoleEntryRoute.tsx`: centralized auth-session validation, a shared loading screen, and role-aware redirects for `/patient` and `/doctor`.
- Changed `src/app/ProtectedRoute.tsx` and `src/app/router.tsx`: protected pages now validate the token with the backend before rendering, and the `/patient` and `/doctor` base routes now go to the real app pages when the saved token is valid instead of bouncing to login.
- Changed `src/features/patient/pages/PatientLoginPage.tsx`: centered the title and form, added a secondary button that sends users to `/doctor/login`, and redirected authenticated patients straight to `/patient/home`.
- Changed `src/features/doctor/pages/DoctorLoginPage.tsx`: redirected authenticated doctors straight to `/doctor/dashboard` after validating the saved token.
- Changed `AGENTS.md`: recorded the auth redirect and login layout update.
- Current progress: authenticated patient/doctor sessions now validate against `GET /auth/me`, invalid tokens are cleared, `/patient` and `/doctor` resolve to the actual app pages when possible, and the patient login screen is centered with a doctor-login shortcut.
- Remaining work: optional visual refinement of the login layout if you want a more stylized screen; `npm.cmd run build` passes.

- Changed `vite.config.ts`: allowed Vite dev server requests from ngrok free tunnel hostnames so phone previews on a different network are not blocked by Vite host checking.
- Changed `AGENTS.md`: recorded the ngrok preview host configuration update.
- Current progress: ngrok domains ending in `.ngrok-free.dev` and `.ngrok-free.app` are accepted by the frontend dev server.
- Remaining work: restart the Vite dev server after this config change, then rerun `ngrok http 5173`; no build was needed for this dev-server-only setting.
- Changed `src/features/doctor/pages/DoctorDashboardPage.tsx`: added collapsible patient session sections in the doctor dashboard sidebar, keeping the selected patient/session active while allowing the nested session list to hide and show.
- Changed `AGENTS.md`: recorded the doctor dashboard collapsible session section update.
- Current progress: patient cards can now toggle their nested `Sessions` list; selecting another patient still opens that patient's latest session.
- Remaining work: none for this task; `npm run build` passes.
- Changed `src/features/patient/pages/PatientRecordPage.tsx`: removed the separate per-task additional note textarea from the review step, stopped keeping its local state, and stopped sending `note` when saving a task.
- Changed `AGENTS.md`: recorded the patient record UI cleanup.
- Current progress: the “บันทึกเพิ่มเติมของท่านี้” box is removed while the symptom-specific “เขียนเพิ่มเติมเกี่ยวกับอาการ” box remains; `npm run build` passes.
- Remaining work: none for this task.
- Changed `tests/e2e/run-e2e.mjs`: made E2E cleanup remove `backend/uploads-e2e/` both before and after Playwright runs, while still cleaning Docker compose volumes.
- Changed `README.md` and `PROJECT_FLOW_FOR_AI.md`: updated validation and flow documentation to reflect Playwright E2E coverage, the 6-task backend-backed flow, and the remaining test gaps.
- Changed `AGENTS.md`: updated testing guidance now that `npm run test:e2e` exists and recorded this cleanup pass.
- Current progress: remaining Hybrid Flow Test Plan cleanup is implemented; `npm run build` passes and `npx playwright test --list` discovers both E2E specs.
- Remaining work: full `npm run test:e2e` still requires Docker Desktop/daemon to be running; this environment currently cannot connect to `npipe:////./pipe/docker_engine`.
- Changed `package.json` and `package-lock.json`: added Playwright as a dev dependency and added `npm run test:e2e`.
- Added `playwright.config.ts`: configured Playwright to start the FastAPI backend and Vite frontend for E2E runs.
- Added `docker-compose.e2e.yml` and `tests/e2e/fake-mediapipe/`: added an isolated MongoDB service plus a fake MediaPipe HTTP service for repeatable full-flow tests.
- Added `tests/e2e/run-e2e.mjs`, `start-backend.mjs`, and `start-vite.mjs`: orchestrates Docker dependencies, test backend env, frontend env, and Playwright execution.
- Added `tests/e2e/specs/api-flow.spec.ts`: covers backend critical path from patient uploads through analysis, doctor feedback, patient feedback, and admin detail visibility.
- Added `tests/e2e/specs/ui-flow.spec.ts`: covers browser patient upload flow, doctor feedback submission, patient feedback page, and admin videos/feedback/payload sections.
- Changed patient, doctor, and admin frontend pages/components: added stable `data-testid` selectors for E2E tests without changing user-facing behavior.
- Changed `.gitignore`: ignores `.tmp/` and `backend/uploads-e2e/` generated by E2E runs.
- Current progress: Playwright config and specs load successfully, and frontend build passes.
- Remaining work: full `npm run test:e2e` execution requires Docker Desktop/daemon to be running; current environment could not connect to Docker.
- Changed `src/app/ProtectedRoute.tsx`: added a reusable route guard for patient, doctor, and admin protected pages.
- Changed `src/app/router.tsx`: wrapped patient workflow pages plus doctor/admin dashboards with role-specific route guards.
- Changed `src/lib/backendApi.ts`: added a patient token clear helper and kept role token helpers centralized.
- Changed `src/features/patient/pages/PatientStatusPage.tsx`: added polling while analysis or doctor review is still in progress so patient status updates without a manual refresh.
- Changed `src/features/patient/pages/PatientRecordPage.tsx`: improved the no-camera fallback review state so it asks the patient to upload a video instead of implying capture succeeded.
- Changed `src/features/doctor/api/doctorApi.ts` and `src/features/doctor/data/doctor.mock.ts`: kept backend file IDs on doctor task models and moved secure playback URL creation to on-demand lookup.
- Changed `src/features/doctor/pages/DoctorDashboardPage.tsx`: added on-demand secure video playback URLs, refresh-on-video-error behavior, and structured feedback fields for recommendations, exercise plan, retake requests, and task notes.
- Changed `src/features/admin/pages/AdminDashboardPage.tsx`: refreshes selected user detail when admin video preview fails, which helps recover from expired playback links.
- Current progress: frontend reliability pass is implemented for protected routing, status refresh, no-camera upload fallback, doctor video playback token refresh, and structured feedback payloads; frontend build passes.
- Remaining work: automated frontend tests are still not configured, legacy/prototype modules still exist, and broader Thai mojibake cleanup remains a separate pass.
- Changed `src/features/admin/components/AdminNavigation.tsx`: added shared admin navigation and section query helpers for dashboard/patient admin pages.
- Changed `src/features/admin/pages/AdminDashboardPage.tsx`: wired sidebar/topbar/table/detail actions to real routes or query-driven sections, added overview-backed analytics/audit/settings panels, supported `section`, `user`, and `create` query params, and removed dead edit/more buttons.
- Changed `src/features/admin/pages/AdminPatientsPage.tsx`: reused shared admin sidebar, wired logout/help/notification/settings actions, added CSV export for filtered patients, routed Add Patient and patient detail actions into the dashboard with selected context.
- Current progress: admin dashboard navigation and main admin actions now use existing frontend routes/backend APIs instead of inert buttons; frontend build passes.
- Remaining work: backend endpoints would still be needed for true appointment scheduling, doctor reassignment, device management, and editable settings.
- Changed `AGENTS.md`: expanded contributor guide into a role/page/backend map so future agents can quickly locate the right code.
- What this file does: stores repository guidance, workflow rules, code map, commands, validation notes, and task progress.
- Current progress: frontend routes, page ownership, backend routers/services, common change map, commands, style, testing, and security notes are documented.
- Remaining work: none for this task.
