# Movement Analysis Subsystem

Current active flow: patient and doctor routes are wired to the FastAPI backend in `backend/` for the demo. A doctor creates an assigned recording session for a patient first; the patient `/patient` page only shows that active assigned session and otherwise displays an empty state. The older `src/features/analysis` and `src/features/dashboard` folders are legacy prototype screens and are not connected in `src/app/router.tsx`.

Frontend prototype for a home-based markerless movement analysis and tele-rehabilitation workflow. The app helps patients record or upload movement videos from home, while doctors can review movement quality, risk flags, event markers, and feedback summaries.

## Current Work Log

- Active flow: doctor-assigned patient sessions are wired end to end through the FastAPI backend. The patient `/patient` page now shows only the assigned active recording session and falls back to an empty state if no session exists.
- Frontend status: the unified landing/login flow, patient recording flow, doctor dashboard, and admin console are all connected to the current route structure under `src/app/router.tsx`.
- Backend status: the backend now uses the newer session/task/upload mapping while keeping compatibility aliases for the current frontend.
- Validation status: `npm run build` passes. Full `npm run test:e2e` still depends on Docker Desktop/daemon being available for the Playwright service stack.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the frontend development server:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

Run the backend development server:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8001
```

Open the FastAPI docs at:

```text
http://127.0.0.1:8001/docs
```

Backend notes:

- Copy `backend/.env.example` to `backend/.env` and adjust values if needed.
- Start MongoDB before running the backend. The default local URI is `mongodb://localhost:27017`.
- The backend can call the MediaPipe service through `MEDIAPIPE_SERVICE_URL`, which defaults to `http://127.0.0.1:8000`.
- Run the frontend and backend together for the active patient/doctor demo flow.

Build production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Validation

Run the frontend production build check:

```bash
npm run build
```

Run the hybrid E2E flow after Docker Desktop is running:

```bash
npm run test:e2e
```

The E2E runner starts an isolated MongoDB service and fake MediaPipe service with Docker compose, then starts the FastAPI backend and Vite frontend through Playwright.

## Current Prototype Limitations

- The active patient, doctor, and admin flows use the FastAPI backend, but local runs still require MongoDB and a MediaPipe-compatible service for full analysis.
- Local demo upload storage is not suitable for real patient data.
- The E2E MediaPipe service is a deterministic fake and does not validate clinical pose-estimation accuracy.
- Negative E2E cases such as expired tokens, failed MediaPipe analysis, upload quota, and validation failures are still future work.
- Browser E2E coverage uses Playwright. Unit/component tests such as Vitest or React Testing Library are still not configured.
- Some Thai text in existing files appears mojibake/encoding-corrupted.

## Future Work

- Fix Thai text encoding in source and mock data.
- Add negative E2E cases for expired tokens, failed MediaPipe analysis, upload quota limits, and validation failures.
- Add unit/component tests around high-risk frontend and backend helpers.
- Replace local demo upload storage with production-grade object storage or signed upload flow.
- Add a clinically validated pose-estimation and screening pipeline.
- Harden role-based authentication and authorization for production use.

## Privacy And Safety Notes

This project handles movement videos and patient health context, so keep these rules in mind when developing further:

- Do not store raw videos or health data in plaintext client storage.
- Use signed URLs or a secure upload flow for real video files.
- Separate patient, doctor, and admin permissions carefully.
- Use patient IDs instead of real names when identity is not required.
- Keep audit logs for access to sensitive data and security-relevant actions.
- Do not commit real secrets, production patient data, raw videos, local upload folders, or `.env` files.
