import type {
  DoctorFeedback,
  PatientSession,
  PatientSessionStatus,
  SavePatientSessionTaskPayload,
} from "@/features/patient/types/patient.types";
import { backendRequest } from "@/lib/backendApi";

type UploadResponse = {
  fileId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

function normalizeSession(session: PatientSession | null): PatientSession | null {
  if (!session) return null;
  return {
    ...session,
    id: session.id ?? session.sessionId,
    tasks: session.tasks.map((task) => ({
      ...task,
      id: task.id ?? task.sessionTaskId ?? task.taskId ?? task.movementType,
      sessionTaskId: task.sessionTaskId ?? task.id,
    })),
  };
}

function normalizeFeedback(feedback: DoctorFeedback | null): DoctorFeedback | null {
  if (!feedback) return null;
  return {
    ...feedback,
    id: feedback.id ?? (feedback as DoctorFeedback & { feedbackId?: string }).feedbackId ?? "feedback-latest",
    exercisePlan: feedback.exercisePlan ?? [],
    retakeRequests: feedback.retakeRequests ?? [],
    taskNotes: feedback.taskNotes ?? [],
    recommendations: feedback.recommendations ?? [],
    followUpPlan: feedback.followUpPlan ?? {
      nextCheckIn: "Follow up in the next scheduled review.",
      watchFor: [],
      escalationNote: "Contact the clinic if symptoms worsen.",
    },
  };
}

export async function uploadPatientVideo(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return backendRequest<UploadResponse>("/uploads/video", {
    body: formData,
    method: "POST",
  });
}

export async function getPatientDraftSession() {
  const session = await backendRequest<PatientSession | null>("/patient/sessions/active");
  return normalizeSession(session);
}

export async function getLatestPatientSession() {
  const session = await backendRequest<PatientSession | null>("/patient/sessions/latest");
  return normalizeSession(session);
}

export async function savePatientSessionTask(payload: SavePatientSessionTaskPayload) {
  let fileId = payload.fileId;
  if (!fileId && payload.file) {
    const upload = await uploadPatientVideo(payload.file);
    fileId = upload.fileId;
  }

  if (!fileId) {
    throw new Error("A video file is required before saving this movement task.");
  }

  const endpoint = payload.sessionTaskId
    ? `/patient/sessions/draft/session-tasks/${payload.sessionTaskId}`
    : `/patient/sessions/draft/tasks/${payload.movementType}`;

  const session = await backendRequest<PatientSession>(
    endpoint,
    {
      body: JSON.stringify({
        fileId,
        note: payload.note,
        quality: payload.quality,
        symptomReport: payload.symptomReport,
        view: payload.view,
      }),
      method: "POST",
    },
  );
  return normalizeSession(session)!;
}

export async function submitPatientSession() {
  const session = await backendRequest<PatientSession>("/patient/sessions/submit", {
    method: "POST",
  });
  return normalizeSession(session)!;
}

export async function getPatientSessionStatus(sessionId: string): Promise<PatientSessionStatus> {
  const session = await backendRequest<PatientSession | null>("/patient/sessions/latest");
  const normalized = normalizeSession(session);
  if (!normalized || normalized.id !== sessionId) {
    return "queued_analysis";
  }
  return normalized.status;
}

export async function getLatestDoctorFeedback(): Promise<DoctorFeedback | null> {
  const feedback = await backendRequest<DoctorFeedback | null>("/patient/feedback/latest");
  return normalizeFeedback(feedback);
}
