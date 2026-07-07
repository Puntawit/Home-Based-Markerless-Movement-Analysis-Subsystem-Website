# Movement Analysis Subsystem: Project Flow For AI

## Project Summary

This project is a frontend prototype for a home-based markerless movement analysis and tele-rehabilitation workflow.

The main idea is:

1. A patient records or uploads movement videos from home.
2. The system stores each movement task in a draft assessment session.
3. After all required tasks are completed, the patient submits the session.
4. The system shows a mock processing flow for pose extraction and screening.
5. A doctor reviews movement quality, risk flags, event markers, charts, and writes feedback.
6. The patient reads the doctor feedback and exercise plan.

The active patient, doctor, and admin flows are wired to the FastAPI backend in `backend/`, with MongoDB metadata storage and MediaPipe service integration for analysis. Some legacy prototype screens still use older mock data.

## Tech Stack

- Vite
- React 18
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- Recharts
- Lucide React icons

## Current Runtime Shape

The app starts from `src/main.tsx`, wraps the app with `AppProviders`, then renders routes from `src/app/router.tsx`.

Main routes:

| Route | Purpose |
| --- | --- |
| `/` | Redirects to `/patient/login` |
| `/patient/login` | Mock patient login |
| `/patient/home` | Patient home and current draft session |
| `/patient/tutorial` | Tutorial before recording a movement task |
| `/patient/record` | Camera setup, recording/upload, review, symptom report, save task |
| `/patient/status` | Session processing and review status |
| `/patient/feedback` | Patient-facing doctor feedback |
| `/doctor/login` | Demo doctor login |
| `/doctor/dashboard` | Doctor review dashboard |
| `/admin/login` | Admin password login |
| `/admin/dashboard` | Admin users, videos, feedback, and payload console |

The `src/features/analysis` and `src/features/dashboard` folders contain older or standalone analysis UI code, but they are not currently connected in `src/app/router.tsx`.

## Main Concepts

### Patient

The prototype uses one demo patient:

```text
PATIENT-7712
```

Defined in:

```text
src/features/patient/data/patient.mock.ts
```

### Assessment Session

A patient session contains 6 required lower-limb ROM movement tasks. A session starts as a draft. Each task becomes recorded after the patient records or uploads a video and saves it.

Session statuses:

| Status | Meaning |
| --- | --- |
| `draft` | Some tasks are not finished yet |
| `ready_to_submit` | All 6 tasks are recorded |
| `queued_analysis` | Submitted and waiting for analysis |
| `processing_analysis` | MediaPipe analysis is running |
| `pending_doctor_review` | Analysis completed and waiting for doctor review |
| `feedback_ready` | Doctor feedback is available |

### Movement Tasks

Defined in:

```text
src/features/patient/data/movementTasks.ts
```

Current active tasks:

| Task ID | Display Name | Purpose |
| --- | --- | --- |
| `hip_flexion` | Hip Flexion | Seated trunk-to-thigh ROM check |
| `hip_extension` | Hip Extension | Prone straight-leg thigh-rise ROM check |
| `knee_flexion` | Knee Flexion | Seated edge thigh-to-shank flexion check |
| `knee_extension` | Knee Extension | Seated edge return-to-straight knee check |
| `ankle_dorsiflexion` | Ankle Dorsiflexion | Seated heel-down shank-to-foot angle check |
| `ankle_plantarflexion` | Ankle Plantarflexion | Seated toe-point shank-to-foot angle check |

Each task includes:

- label and short label
- required camera view
- camera distance instruction
- recording duration
- tutorial title/body
- optional safety note
- symptom questions for relevant body parts

## Patient Flow

### 1. Login

File:

```text
src/features/patient/pages/PatientLoginPage.tsx
```

The login page calls `mockLogin()` from `patientApi.ts`. It does not validate real credentials. On success, it navigates to:

```text
/patient/home
```

### 2. Patient Home

File:

```text
src/features/patient/pages/PatientHomePage.tsx
```

The home page loads:

- current draft session
- latest submitted session
- latest doctor feedback

Mock API functions:

```text
getPatientDraftSession()
getLatestPatientSession()
getLatestDoctorFeedback()
```

The page shows the 6 lower-limb ROM movement tasks. Selecting a task navigates to:

```text
/patient/tutorial?task=<task_id>
```

When all 6 tasks are recorded, the submit button becomes enabled. Pressing it calls:

```text
submitPatientSession()
```

Then the user is sent to:

```text
/patient/status
```

### 3. Tutorial

File:

```text
src/features/patient/pages/PatientTutorialPage.tsx
```

The tutorial page reads the selected task from the `task` query parameter.

Example:

```text
/patient/tutorial?task=hip_flexion
```

It displays the tutorial text and task-specific camera instructions. The page simulates watching a tutorial video by enabling the next button after a short delay.

Next route:

```text
/patient/record?task=<task_id>
```

### 4. Record / Upload

File:

```text
src/features/patient/pages/PatientRecordPage.tsx
```

This is the most important patient workflow. It has 3 phases:

| Phase | Purpose |
| --- | --- |
| `preflight` | Open camera preview and confirm setup checklist |
| `capture` | Countdown, record webcam video, auto-stop after task duration |
| `review` | Preview video, upload/replace file, fill symptoms, save task |

#### Preflight Phase

The patient confirms:

- A4 reference is visible
- full body is visible
- camera distance is correct
- lighting is good
- safety note is accepted, if the task has one

The app tries to open the webcam with:

```text
navigator.mediaDevices.getUserMedia()
```

If the browser cannot open or record webcam video, the app moves to review mode and asks the user to upload a video instead.

#### Capture Phase

The page uses:

```text
MediaRecorder
```

It performs a countdown, records the video, auto-stops after `task.durationSeconds`, converts the recorded blob to a `File`, and moves to review.

#### Review Phase

The patient can:

- preview the recorded/uploaded video
- upload or replace a `.mp4`, `.mov`, or `.webm` file
- see video quality checks based on the preflight checklist
- answer symptom questions per body part
- add notes
- save this movement task into the draft session

Saving calls:

```text
savePatientSessionTask()
```

After saving, TanStack Query invalidates the draft session query and navigates back to:

```text
/patient/home
```

### 5. Submit Session

File:

```text
src/features/patient/api/patientApi.ts
```

When all 6 tasks are recorded, `submitPatientSession()` changes the draft into a submitted session with status:

```text
queued_analysis
```

The backend then starts MediaPipe analysis jobs and moves the session through analysis and doctor-review statuses.

### 6. Status Page

File:

```text
src/features/patient/pages/PatientStatusPage.tsx
```

The status page shows the active backend-backed pipeline:

1. Session submitted
2. MediaPipe Pose Extraction
3. Analysis completed
4. Doctor review

This page displays backend session status and polls while analysis or doctor review is still in progress.

### 7. Feedback Page

File:

```text
src/features/patient/pages/PatientFeedbackPage.tsx
```

Loads feedback from:

```text
getLatestDoctorFeedback()
```

Displays:

- doctor name and date
- patient-friendly summary
- retake requests
- task-by-task feedback
- exercise plan
- follow-up plan
- warning symptoms to watch for

## Doctor Flow

### Doctor Dashboard

File:

```text
src/features/doctor/pages/DoctorDashboardPage.tsx
```

Shared type/mock shape helpers still live in:

```text
src/features/doctor/data/doctor.mock.ts
```

The doctor dashboard lets a doctor:

1. Search/select a patient.
2. Select an assessment session.
3. Select a movement task.
4. View a skeleton/video placeholder.
5. Move through frame timeline markers.
6. Inspect event markers such as warning or critical frames.
7. Read risk level, confidence, quality score, flags, and recommended action.
8. View Recharts line graphs for movement metrics.
9. Write a clinical summary and patient-friendly summary.
10. Use UI buttons for exercise plan, retake task, and structured feedback.

The active doctor dashboard reads backend sessions, shows analyzed task results, and submits structured feedback back to the backend so the patient can read it.

## Intended Full System Architecture

The project proposal describes a bigger 5-layer system:

| Layer | Purpose |
| --- | --- |
| L1 Sensing / Capture | Patient records video with smartphone/webcam |
| L2 Pose Estimation / QC | Backend extracts skeleton/keypoints and checks quality |
| L3 Feature Extraction | Backend calculates clinical movement features |
| L4 Analysis / Screening | Rule-based or lightweight ML flags risk and abnormality |
| L5 Application UI | Patient and doctor web interfaces |

The current demo implements the core L1/L5 application flow and stores metadata in MongoDB. L2-L4 are represented by the external MediaPipe service integration and normalized analysis payloads, with the E2E stack using a fake MediaPipe service.

## Important Data Flow For Future AI Work

```mermaid
flowchart TD
  A["Patient Login"] --> B["Patient Home"]
  B --> C["Select Movement Task"]
  C --> D["Tutorial"]
  D --> E["Record Page: Preflight"]
  E --> F["Record Page: Capture or Upload"]
  F --> G["Record Page: Review"]
  G --> H["savePatientSessionTask"]
  H --> B
  B --> I{"All 6 tasks recorded?"}
  I -->|"No"| C
  I -->|"Yes"| J["submitPatientSession"]
  J --> K["Patient Status"]
  K --> L["Patient Feedback"]

  J --> M["Backend Analysis Job"]
  M --> N["MediaPipe Service"]
  N --> O["Doctor Dashboard"]
  O --> P["Write Structured Feedback"]
  P --> L
```

## Key Files For AI Agents

| File | Why It Matters |
| --- | --- |
| `src/app/router.tsx` | Defines the currently active routes |
| `src/app/providers.tsx` | Sets up TanStack Query |
| `src/features/patient/api/patientApi.ts` | Patient backend API helpers |
| `src/features/patient/data/movementTasks.ts` | Movement task definitions |
| `src/features/patient/data/patient.mock.ts` | Legacy demo patient/mock data |
| `src/features/patient/types/patient.types.ts` | Patient/session/feedback TypeScript types |
| `src/features/patient/pages/PatientHomePage.tsx` | Patient draft session overview and submit button |
| `src/features/patient/pages/PatientRecordPage.tsx` | Camera setup, recording, upload, review, symptom report |
| `src/features/patient/pages/PatientStatusPage.tsx` | Backend processing and review status |
| `src/features/patient/pages/PatientFeedbackPage.tsx` | Patient-facing feedback |
| `src/features/doctor/data/doctor.mock.ts` | Doctor type/mock shape helpers |
| `src/features/doctor/pages/DoctorDashboardPage.tsx` | Doctor review UI |

## Current Limitations

- Local demo upload storage is not suitable for real patient data.
- Full analysis depends on an external MediaPipe-compatible service outside the frontend/backend dev servers.
- The E2E MediaPipe service is a deterministic fake and does not validate clinical pose-estimation accuracy.
- Negative E2E cases such as expired tokens, failed MediaPipe analysis, upload quota, and validation failures are still future work.
- Some Thai text in existing files appears mojibake/encoding-corrupted.
- Hybrid E2E coverage is configured through Playwright, with Docker compose providing MongoDB and a fake MediaPipe service for the happy path.

## Suggested Next Steps

1. Fix Thai text encoding in source and mock data.
2. Add negative E2E coverage for token expiry, failed analysis, upload quota, and validation failures.
3. Add unit/component tests around high-risk frontend and backend helpers.
4. Replace local demo upload storage with production-grade object storage or signed upload flow.
5. Add a clinically validated pose-estimation and screening pipeline.
6. Harden role-based authentication and authorization for production use.
