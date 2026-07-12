# Repository Guidelines

## Project Overview

This repository is a movement-analysis demo for home rehabilitation. The frontend is React/Vite/TypeScript in `src/`; the backend is FastAPI/MongoDB in `backend/app/`. The active product flow is: doctor creates/assigns a patient recording session, patient logs in and records or uploads the assigned lower-limb ROM task videos, patient submits the session, backend runs MediaPipe analysis jobs, doctor reviews results and sends feedback, patient reads feedback, and admin monitors users/system data.

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

- `/` -> `src/app/LandingPage.tsx`. First screen with only patient/doctor role selection buttons.
- `/auth/login?type=patient` and `/auth/login?type=doctor` -> `src/app/AuthLoginPage.tsx`. Shared role-aware login screen. Both roles call `loginWithPassword()` in `src/lib/backendApi.ts`, which posts `POST /auth/login`.
- `/auth/change-password?type=<role>` -> `src/app/ChangePasswordPage.tsx`. Shown after login when the backend returns `mustChangePassword` (a temporary password provisioned by an admin).
- `/patient` -> `PatientHomePage.tsx`. Shows the active doctor-assigned session only, latest submitted session, latest feedback, and submit button. If there is no active assigned session, it shows an empty state instead of creating a draft. Edit this for patient dashboard/task list behavior.
- `/patient/tutorial?task=<task_id>` -> `PatientTutorialPage.tsx`. Reads task data from `src/features/patient/data/movementTasks.ts`. Edit this for task instructions, tutorial copy, or pre-record guidance.
- `/patient/record?task=<task_id>` -> `PatientRecordPage.tsx`. Handles webcam access, countdown, `MediaRecorder`, upload fallback, video preview, symptom report, quality checklist, and task saving.
- `/patient/status` -> `PatientStatusPage.tsx`. Displays analysis/review status after submission.
- `/patient/feedback` -> `PatientFeedbackPage.tsx`. Displays doctor feedback, retake requests, task notes, exercise plan, and follow-up plan.

Doctor flow:

- `/doctor` -> `DoctorDashboardPage.tsx`. Shows backend-backed assigned patients/session list, Add Session form, selected task video, risk flags, metrics, analysis retry, and feedback form. API mapping is in `src/features/doctor/api/doctorApi.ts`; mock type shapes still live in `src/features/doctor/data/doctor.mock.ts`.

Admin flow:

- `/admin/login` -> `src/features/admin/pages/AdminLoginPage.tsx`. Uses username/password backend login.
- `/admin/dashboard` -> `AdminDashboardPage.tsx`. The only admin page: patient/doctor user list, Add User form, and a basic-profile detail panel for the selected user. There is no separate patients page or videos/feedback/payload/analytics/audit/settings sections anymore.
- Add User only collects name, age/gender (patient), specialty (doctor), phone, email, and assigned doctor (patient). Login ID and password are always backend-generated (`POST /admin/users` ignores/ omits `userId`/`temporaryPassword` from the frontend) and shown exactly once in a "user created" modal after submit.
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

- `routers/auth.py`: `POST /auth/login`, `POST /auth/change-password`, and `GET /auth/me`. Edit for login behavior, password policy, or auth response shape. `services/login_throttle.py` holds the lockout logic; `scripts/manage_auth.py` is the operator CLI for setting passwords.
- `routers/uploads.py`: `POST /uploads/video`, `POST /uploads/video/{file_id}/playback-token`, and `GET /uploads/video/{file_id}`. Edit for upload validation, quotas, local storage, streaming, and secure playback.
- `routers/patient.py`: active assigned session, compatibility draft alias, save task, submit session, latest session, and latest feedback endpoints under `/patient`.
- `routers/doctor.py`: assigned patient list, doctor-created patient sessions, doctor session list/detail, and feedback submission under `/doctor`.
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
- Change admin console data: start in `AdminDashboardPage.tsx`; update `adminApi.ts`, `routers/admin.py`, and `schemas.py` together.
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

- Changed `backend/app/schemas.py`, `backend/app/services/sessions.py`, `backend/app/services/session_mapper.py`, `backend/app/routers/patient.py`, and `backend/app/routers/doctor.py`: added `assigned` session status, active-recording session lookup without patient auto-create, one-active-session enforcement, doctor session creation at `POST /doctor/patients/{patient_id}/sessions`, assigned patient listing at `GET /doctor/patients`, active sessions in `GET /doctor/sessions`, and `movementType`/`fileId` hydration for `sessionTasks`.
- Changed `src/features/patient/api/patientApi.ts`, `src/features/patient/types/patient.types.ts`, `src/features/patient/pages/PatientHomePage.tsx`, `src/features/patient/pages/PatientTutorialPage.tsx`, `src/features/patient/pages/PatientRecordPage.tsx`, and `src/features/patient/components/LatestSessionCard.tsx`: patient home now loads `/patient/sessions/active`, shows an empty state when no doctor-assigned session exists, carries `sessionTaskId` through tutorial/record routes, and saves into the assigned session task.
- Changed `src/features/doctor/api/doctorApi.ts`, `src/features/doctor/data/doctor.mock.ts`, and `src/features/doctor/pages/DoctorDashboardPage.tsx`: doctor dashboard now loads assigned patients, includes an Add Session form with default lower-limb ROM task selection and optional instructions, creates sessions, shows active recording sessions as “Waiting for patient recording,” and keeps review/feedback controls for submitted analysis sessions.
- Changed `tests/e2e/specs/api-flow.spec.ts` and `tests/e2e/specs/ui-flow.spec.ts`: E2E flows now have the doctor create a session before patient recording, and the API spec checks that creating a second active session returns `409 Conflict`.
- Changed `README.md`, `backend/README.md`, `PROJECT_FLOW_FOR_AI.md`, and `AGENTS.md`: documented the doctor-assigned session flow, active recording states, new doctor/patient endpoints, and updated route ownership notes.
- Current progress: doctor-assigned patient sessions are implemented end to end; `uv run python -m compileall app` and `npm.cmd run build` pass.
- Remaining work: full `npm run test:e2e` still needs Docker Desktop/daemon and the E2E service stack running.

- Added `src/app/LandingPage.tsx`: created the simple root landing page with only two large role-selection buttons for patient and doctor.
- Added `src/app/AuthLoginPage.tsx`: created a shared `/auth/login?type=patient|doctor` login page that switches the form and destination by query param.
- Changed `src/app/router.tsx` and `src/app/ProtectedRoute.tsx`: made `/patient` the protected patient home route, `/doctor` the protected doctor dashboard route, routed old login/dashboard paths to the new structure, and sent unauthenticated users to the shared login page.
- Deleted `src/features/patient/pages/PatientLoginPage.tsx`, `src/features/doctor/pages/DoctorLoginPage.tsx`, and `src/app/RoleEntryRoute.tsx`: removed the split login pages and the old entry redirect helper.
- Changed patient/doctor navigation files and `tests/e2e/specs/ui-flow.spec.ts`: updated logout, back links, save redirects, and E2E URLs to use `/patient`, `/doctor`, and `/auth/login?type=...`.
- Changed `PROJECT_FLOW_FOR_AI.md` and `AGENTS.md`: updated route documentation for the new landing/login structure.
- Current progress: the login flow is unified, mobile-first, and role-protected; `npm.cmd run build` passes.
- Remaining work: full `npm run test:e2e` was not run because it requires Docker Desktop/daemon.

- Changed `src/features/patient/pages/PatientHomePage.tsx`: hid the progress percentage value on the patient home progress bar so the page no longer shows `%`.
- Changed `AGENTS.md`: recorded the patient home percentage cleanup.
- Current progress: the patient home progress bar still shows progress visually, but the numeric `%` text is hidden on that page.
- Remaining work: none for this task; a build check is still recommended.

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

- Changed `src/features/patient/data/movementTasks.ts`, `src/features/patient/pages/PatientHomePage.tsx`, `src/features/patient/pages/PatientStatusPage.tsx`, `src/features/patient/pages/PatientRecordPage.tsx`, `src/features/patient/pages/PatientFeedbackPage.tsx`, `src/features/patient/components/UploadVideoBox.tsx`, `src/features/patient/components/FeedbackCard.tsx`, and `src/features/patient/components/LatestSessionCard.tsx`: translated the patient-facing copy on `/patient` into Thai while keeping task names unchanged, including dashboard labels, session/status cards, upload prompts, recording errors, and feedback/exercise labels.
- Current progress: the patient flow reads in Thai for normal user-facing text, while task names such as `Hip Flexion` stay as-is.
- Remaining work: a few backend-provided strings and legacy status labels may still surface in English depending on data returned by the API; `npm.cmd run build` passes.
- Reworked `src/features/patient/data/movementTasks.ts` and rechecked the patient UI copy after a mojibake regression: restored readable Thai text for task instructions, symptom labels, upload text, and session cards.
- Current progress: the patient-facing Thai text is back to readable UTF-8 in the rebuilt source files, and `npm.cmd run build` passes after the repair pass.
- Remaining work: if any older cached browser assets still show broken Thai, refresh the browser hard or restart the dev server so it loads the rebuilt bundle.

- Changed `backend/app/core/auth.py`, `backend/app/routers/auth.py`, `backend/app/routers/patient.py`, `backend/app/routers/doctor.py`, `backend/app/routers/admin.py`, `backend/app/routers/analysis.py`, `backend/app/routers/uploads.py`, `backend/app/db/mongo.py`, `backend/app/schemas.py`, `backend/app/main.py`, and backend services under `backend/app/services/`: refactored the backend toward DB-backed `users`, `tasks`, `sessions.sessionTasks`, `uploads.uploadId`, and `sessions.analysis`, while keeping compatibility aliases like `fileId`, legacy analysis-job routes, and legacy `tasks` in session responses for the current frontend.
- Added `backend/app/services/users.py`, `backend/app/services/task_catalog.py`, `backend/app/services/storage.py`, and `backend/app/services/session_mapper.py`: introduced shared helpers for seeding/migrating users and tasks, local-storage metadata, and mapping new session documents back into frontend-compatible response shapes.
- Changed `backend/README.md`, `PROJECT_FLOW_FOR_AI.md`, and `AGENTS.md`: documented the new backend schema direction, compatibility behavior, and migration-oriented workflow.
- What these backend files now do: `users.py` seeds and resolves UUID/public user identities, `task_catalog.py` seeds active movement task definitions, `storage.py` stores upload metadata with object keys, `sessions.py` creates and upgrades `sessionTasks`, `analysis.py` runs per-session analysis using `sessions.analysis`, and `session_mapper.py` hydrates new session documents into current API responses.
- Current progress: new backend writes are aligned with the target schema direction, frontend `npm.cmd run build` still passes, and Python syntax compilation for `backend/app` passes.
- Remaining work: true backend runtime validation still needs backend dependencies installed locally (`fastapi` was unavailable in this environment), old collections such as `admin_users` and `analysis_jobs` are kept only for migration compatibility paths, and Playwright/API E2E specs still need a full rerun against the refactored backend when the backend environment is available.
- Changed `backend/app/services/users.py`: removed the back-reference import to `hash_password` from `app.core.auth` so backend startup no longer hits the circular import between `auth.py` and `users.py`.
- Current progress: the previous `ImportError: cannot import name 'hash_password' from partially initialized module 'app.core.auth'` is fixed, and `python compileall backend/app` still passes.
- Remaining work: rerun `uv run uvicorn app.main:app --reload --port 8001` inside `backend/` to confirm full startup in the project virtualenv; a plain system Python import check still lacks `fastapi`, which is expected outside the `uv` environment.
- Changed `backend/app/services/common.py`, `backend/app/services/sessions.py`, `backend/app/services/task_catalog.py`, `backend/app/services/storage.py`, `backend/app/services/analysis.py`, and `backend/app/db/mongo.py`: extracted shared time/ID helpers to break service-level circular imports and changed new unique Mongo indexes to partial unique indexes so legacy records with missing fields like `uploadId = null` no longer block backend startup.
- Current progress: the later `ImportError` between `sessions.py` and `task_catalog.py` is fixed, and the Mongo startup failure now has a compatibility-safe index definition; `python compileall backend/app` still passes.
- Remaining work: rerun `uv run uvicorn app.main:app --reload --port 8001` inside `backend/` to confirm startup gets past Mongo index creation in your local database; if another startup error appears, it should now be the next real runtime issue rather than the same circular import/index problem.

- Changed `backend/app/db/mongo.py`: added a startup-safe helper for partial unique string indexes that detects legacy indexes with the same auto-generated name but different options, drops only the mismatched index, and recreates it with the expected partial filter.
- What this file does: manages MongoDB connection lifecycle and creates required collection indexes during FastAPI startup.
- Current progress: fixed the Mongo `IndexKeySpecsConflict` caused by an existing legacy `userId_1` index without `partialFilterExpression`; `uv run python -m compileall app` passes and the running backend responds to `GET /health` with `{"status":"ok"}`.
- Remaining work: port `8001` is already occupied by an existing project `uvicorn app.main:app --reload --port 8001` process, so starting another backend on the same port still fails with `WinError 10048`; stop the existing process or use another port if you need a second instance.

- Changed `README.md`: added a concise current work log near the top so the repository landing page now reflects the active doctor-assigned session flow, the unified frontend route structure, backend compatibility mapping, and the current validation status.
- Current progress: the README now surfaces the latest project state without removing the existing overview, setup, or limitation sections.
- Remaining work: none for this documentation pass.

- Replaced demo auth with real password authentication (Phase 1 of the production-hardening plan). Deleted `POST /auth/mock-login`, which issued a valid access token from a `role` string with no credential at all, and `POST /auth/admin-login`, which duplicated it. Both are now served by a single `POST /auth/login` taking `{identifier, password, role?}`.
- Added `backend/app/services/login_throttle.py` and the `login_attempts` collection (unique `key`, TTL on `lockedUntil`): per-identifier and per-IP lockout after `MAX_FAILED_LOGINS` failures. Implemented on Mongo rather than adding redis/slowapi. The per-IP limit is deliberately 4x looser (shared clinic NAT) and only becomes trustworthy once a reverse proxy sets a validated forwarded header.
- Added `validate_security_settings()` in `backend/app/core/config.py`, called as the first statement of the `main.py` lifespan: the app raises `RuntimeError` at startup if `AUTH_SECRET_KEY` is the shipped default or shorter than 32 chars. No override flag, by design.
- `hash_password`/`verify_password` in `core/auth.py` existed but were never called on a user. They are now the credential path; default iterations raised 390000 -> 600000. Safe without migration because `verify_password` reads the iteration count out of each stored hash. Kept stdlib PBKDF2 instead of adding argon2/bcrypt; the `pbkdf2_sha256$...` prefix leaves an additive migration path.
- Login returns an identical `401 Invalid credentials.` for wrong password, unknown user, and `passwordHash: None`. The real reason goes to `audit_events` only. A null `passwordHash` is a hard stop, never a fall-through — seeded and migrated users start that way on purpose.
- `POST /admin/users` now provisions a real `passwordHash` plus `mustChangePassword: true`, generating a temporary password when none is supplied and returning it exactly once. Added `POST /auth/change-password` and `src/app/ChangePasswordPage.tsx` (route `/auth/change-password?type=...`) to close the forced-change loop.
- Added `backend/scripts/manage_auth.py` (`hash-password`, `set-password`) as the operator bootstrap tool. Needed because `seed_default_users` no-ops on a non-empty `users` collection, so pre-existing users would otherwise be permanently unable to log in. `ADMIN_PASSWORD_HASH` is retained purely as a bootstrap fallback for the `ADMIN_USERNAME` account.
- Frontend: `AuthLoginPage.tsx` now sends the password it was already collecting and throwing away, adds `{patient,doctor}-password` testids, maps 401/403/429 to Thai messages, and honours `mustChangePassword`. `mockLogin`/`loginDoctorDemo`/`loginAdminDemo` deleted in favour of `loginWithPassword`.
- E2E: `DEMO_LOGIN_PASSWORD` seeds demo patient/doctor credentials (admin stays bootstrap-only so that path is exercised); `AUTH_SECRET_KEY` lengthened to satisfy the startup guard; `PBKDF2_ITERATIONS=100000` keeps tests fast. Added `tests/e2e/specs/auth-negative.spec.ts` covering account enumeration, the removed bypass, lockout, expired/malformed tokens, and cross-role access.
- Current progress: `uv run python -m compileall app scripts` and `npm run build` pass. All auth behaviour above was verified against a live MongoDB on port 27017 with curl, and patient/doctor login was driven through the real UI in a browser.
- Remaining work: full `npm run test:e2e` still needs Docker Desktop running — it was down during this change, so `auth-negative.spec.ts` was verified against a live backend by hand rather than through the Playwright harness. Phases 2 (TLS, encryption at rest, retention job, Mongo auth, secret management) and 3 (httpOnly cookies, refresh tokens, real job queue, pagination) of the plan are not started.

- Added admin-set passwords to the Add User flow. `POST /admin/users` already accepted `temporaryPassword`, but the console form never exposed it and discarded the generated one, so an operator had no way to learn or choose a new user's password. `AdminUserSummary` now also returns `publicId` so the admin sees the login ID.
- Frontend `src/features/admin/pages/AdminDashboardPage.tsx`: the Add User modal has an optional Password field (blank = backend auto-generates), surfaces 400 policy errors inline, and on success shows a one-time `NewCredentialsModal` with the login ID + password to hand over. `adminApi.ts` types gained `temporaryPassword`/`publicId`.
- Verified end to end in the browser: admin login -> create patient with a chosen password -> credentials modal shows `PATIENT-CUSTOM1` / `MyChosen-Pass-9` -> that patient logs in with `mustChangePassword: true`, wrong password returns 401. `npm run build` and `compileall app scripts` pass.
- Operational note for this repo's dev DB: a legacy `admin_users` collection was re-hydrating deleted test users into `users` on every startup via `migrate_admin_users_if_needed`. Cleared both. To keep only the admin, `DEMO_PATIENTS`/`DEMO_DOCTORS`/`DEMO_DOCTOR_PATIENT_IDS` are now empty in `backend/.env`, and the E2E backend sets its own demo users in `tests/e2e/start-backend.mjs`.

- Simplified the admin console to a single page for patient/doctor user management, per request. Deleted `AdminPatientsPage.tsx` and its `/admin/patients` route, and removed the Movement Videos/Doctor Feedback/MediaPipe Payload/Analytics/Audit Logs/System Settings sections from `AdminDashboardPage.tsx` and `AdminNavigation.tsx` (no more `?section=` query param or `AdminSection` type). The remaining dashboard has: user list with Patients/Doctors/All Users tabs and search, Add User modal, and a basic-profile detail panel for the selected user.
- The Add User modal no longer collects a login ID or password — both are always backend-generated (the frontend simply omits `userId`/`temporaryPassword` from `AdminCreateUserPayload`; `POST /admin/users` already generated them when absent). The generated login ID + one-time password still surface via the existing `NewCredentialsModal` after creation.
- `AdminUserSummary` (`schemas.py`, `adminApi.ts`) gained explicit `age`/`gender`/`phone`/`email`/`specialty` fields (additive, alongside the existing combined `subtitle`) so the detail panel can show a real profile instead of videos/feedback. `routers/admin.py`'s `user_summary_from_user` populates them from `profile`/`phone`/`email`. The assigned doctor's name is resolved client-side from the already-loaded user list (no new backend lookup).
- Backend `/admin/overview`, `/admin/patients`, `/admin/users/{id}/detail`, and `/admin/analysis-results/.../payload` endpoints were left as-is (still used by `tests/e2e/specs/api-flow.spec.ts` directly); only the frontend calls to `getAdminOverview`/`getAdminPatients`/`getAdminUserDetail`/`exportAdminMediaPipePayload` were removed from `adminApi.ts` since the simplified dashboard no longer needs them.
- Updated `tests/e2e/specs/ui-flow.spec.ts` to drop the removed `?section=videos/feedback/payload` assertions; it now just checks the patient is visible in the simplified dashboard.
- Verified end to end in the browser (temporary local admin password + CORS origin in `backend/.env`, restored afterward): admin login -> Add Patient modal shows only Name/Age/Gender/Assigned Doctor/Phone/Email (no ID/password fields) -> submit -> one-time credentials modal shows a generated `PATIENT-XXXXXXXX` ID and password -> new patient appears in the table and its detail panel shows the entered age/gender/phone. Test patient removed afterward. `npm run build` and `python -m compileall app` pass; `npx playwright test --list` still resolves 7 specs.

- Follow-up per request: Gender (patient) and Specialty (doctor) in the Add User modal are now `<select>` dropdowns instead of free-text `Input`s — `genderOptions = ["Male", "Female"]` and a fixed `specialtyOptions` list, both defined at the top of `AdminDashboardPage.tsx`.
- Replaced the always-visible detail sidebar with a click-to-open popup (`UserDetailModal`): clicking a user row now opens a modal with their profile fields plus a "Delete User" button (with an inline confirm/cancel step before the actual delete, to guard against misclicks). The dashboard grid is back to a single column since there's no persistent side panel anymore.
- Added `DELETE /admin/users/{user_id}` in `routers/admin.py`: admin-only, 404s for unknown/non patient-doctor ids, deletes the user document, and — if the deleted user is a doctor — clears `assignedDoctorId` on any patients pointing at them so no patient is left referencing a deleted doctor. Audited as `admin.delete_user`. Does not cascade-delete the deleted patient's sessions/uploads/feedback (out of scope for "delete user"; those records simply stop being reachable via the admin console). Added `deleteAdminUser` to `adminApi.ts`.
- Bug found and fixed while wiring this up: `backend/app/main.py`'s CORS middleware only allowed `GET/POST/OPTIONS`, so the browser's DELETE preflight (`OPTIONS /admin/users/{id}`) was rejected with 400 before ever reaching the route. Added `DELETE` to `allow_methods`. This would have blocked any future non-GET/POST admin action too, not just this one.
- Verified end to end in the browser again (same temporary local admin password/CORS trick, reverted after): gender/specialty selects render with the right options; clicking a user row opens the popup with Delete User; clicking Delete User shows the inline confirm step; confirming actually deletes (confirmed via 204 in the backend log and the row disappearing) without touching other existing users. `npm run build` and `python -m compileall app` pass.
