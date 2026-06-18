# Patient Record Video Preview Progress

## Changed files

- `src/features/patient/pages/PatientRecordPage.tsx`
  - Owns the patient movement recording flow: preflight camera setup, webcam capture, review, symptoms, and saving the task into the draft session.
  - Added a local `RecordedVideoPreview` section that shows either a playback video or a waiting placeholder.
  - Moved the retake action into the `RecordedVideoPreview` header next to the ready/waiting status.
  - Re-bound the live webcam stream when the capture phase renders, so the Step 4 REC frame shows the camera feed.
  - Automatically moves the user to the review screen after webcam recording finishes.
  - Removed the manual capture-screen continue action because review now opens automatically.
  - Moved playback to the top of the review screen, before video quality checks and symptom questions.
  - Changed the capture progress display from a percent label to elapsed/total seconds.
  - Kept retake behavior the same: it clears the selected video and returns to preflight setup.

- `src/components/ui/ProgressBar.tsx`
  - Owns the shared progress bar display.
  - Added an optional `valueLabel` prop so specific flows can override the right-side value text.
  - Kept the default percent display when `valueLabel` is not provided.

- `src/features/patient/components/UploadVideoBox.tsx`
  - Owns file selection for uploaded movement videos.
  - Refocused the component on upload/replace only.
  - Removed inline playback from the upload label because playback now lives in `RecordedVideoPreview`.

- `progress-patient-record-video-preview.md`
  - Documents the camera preview, auto-review transition, retake button, validation result, and remaining work.

## Current progress

- Capture screen focuses on the live camera, countdown, REC overlay, and progress while recording.
- Recording progress now shows elapsed time such as `3 / 15 วินาที` instead of a percent value.
- After recording, the patient is moved to review automatically.
- Review screen shows the recorded video at the top and keeps upload/replace available.
- Review screen has the retake button inside the recorded video card header, next to the status badge.
- The bottom review action area now focuses on saving the movement into the session.
- `npm.cmd run build` passes.

## Remaining work

- Manual route check was intentionally skipped for this pass.
