import type { DoctorMetricGroup, DoctorPatient, DoctorRiskLevel, DoctorSession, DoctorSessionTask } from "@/features/doctor/data/doctor.mock";
import type {
  DoctorExercisePlan,
  DoctorRetakeRequest,
  DoctorTaskFeedback,
  PatientMovementType,
} from "@/features/patient/types/patient.types";
import { backendRequest, backendVideoUrl, requireDoctorToken } from "@/lib/backendApi";

type BackendSessionTask = {
  taskId?: string;
  sessionTaskId?: string;
  id?: string;
  movementType: PatientMovementType;
  taskLabel?: string;
  fileId?: string;
  fileName?: string;
  analysisResult?: {
    doctorView?: {
      riskLevel?: DoctorRiskLevel;
      confidence?: number;
      qualityScore?: number;
      qualityIssues?: string[];
      flags?: string[];
      metrics?: { group: DoctorMetricGroup; name: string; value: unknown }[];
    };
  };
};

type BackendSession = {
  sessionId?: string;
  id?: string;
  patientId: string;
  patientName?: string;
  status: string;
  createdAt: string;
  submittedAt?: string;
  tasks: BackendSessionTask[];
  analysisJobId?: string;
  analysisJob?: {
    jobId: string;
    status: string;
    lastError?: string | null;
    taskErrors?: { taskId?: string; movementType?: PatientMovementType; error: string }[];
  };
};

type BackendDoctorPatient = {
  patientId: string;
  patientName: string;
  publicId?: string;
  age?: number | null;
  sessions: BackendSession[];
};

const taskLabels: Record<PatientMovementType, string> = {
  ankle_dorsiflexion: "Ankle Dorsiflexion",
  ankle_plantarflexion: "Ankle Plantarflexion",
  gait_walk: "Gait Walk",
  hip_extension: "Hip Extension",
  hip_flexion: "Hip Flexion",
  knee_extension: "Knee Extension",
  knee_flexion: "Knee Flexion",
  shoulder_flexion: "Shoulder Flexion",
  single_leg_stance: "Single Leg Stance",
  stair_task: "Stair Task",
  sit_to_stand: "Sit to Stand",
};

function mapSessionStatus(status: string): DoctorSession["status"] {
  if (status === "assigned") return "assigned";
  if (status === "draft") return "draft";
  if (status === "ready_to_submit") return "ready_to_submit";
  if (status === "feedback_ready") return "reviewed";
  if (status === "queued_analysis" || status === "processing_analysis") return "processing";
  if (status === "analysis_failed") return "analysis_failed";
  return "pending_review";
}

function mapMetricTone(value: unknown): "slate" | "cyan" | "amber" | "rose" {
  if (typeof value === "boolean") return value ? "amber" : "cyan";
  if (typeof value === "number" && value > 100) return "amber";
  return "cyan";
}

function toTask(task: BackendSessionTask): DoctorSessionTask {
  const view = task.analysisResult?.doctorView;
  const riskLevel = view?.riskLevel ?? "unknown";
  const flags = view?.flags?.length ? view.flags : ["Waiting for MediaPipe result"];

  return {
    id: task.sessionTaskId ?? task.taskId ?? task.id ?? task.movementType,
    movementType: task.movementType,
    taskLabel: task.taskLabel ?? taskLabels[task.movementType],
    fileId: task.fileId,
    riskLevel,
    confidence: view?.confidence ?? null,
    qualityScore: view?.qualityScore ?? null,
    qualityIssues: view?.qualityIssues ?? [],
    recommendedAction: riskLevel === "high" ? "Review manually before feedback." : "Review and send feedback.",
    flags,
    eventMarkers: flags.map((flag, index) => ({
      frame: Math.min(90, 25 + index * 20),
      label: flag,
      severity: riskLevel === "high" ? "critical" : riskLevel === "moderate" ? "warning" : "info",
    })),
    metrics: (view?.metrics ?? []).map((metric) => ({
      group: metric.group,
      label: metric.name.replace(/_/g, " "),
      value: String(metric.value),
      tone: mapMetricTone(metric.value),
    })),
  };
}

function toSession(session: BackendSession): DoctorSession {
  const tasks = session.tasks.map((task) => toTask(task));
  const highestRisk = tasks.some((task) => task.riskLevel === "high")
    ? "high"
    : tasks.some((task) => task.riskLevel === "moderate")
      ? "moderate"
      : tasks.some((task) => task.riskLevel === "low")
        ? "low"
        : "unknown";

  return {
    id: session.sessionId ?? session.id ?? `${session.patientId}-${session.submittedAt ?? session.createdAt}`,
    patientId: session.patientId,
    createdAt: session.submittedAt ?? session.createdAt,
    status: mapSessionStatus(session.status),
    riskLevel: highestRisk,
    analysisJobId: session.analysisJob?.jobId ?? session.analysisJobId,
    analysisJobError:
      session.analysisJob?.lastError ??
      session.analysisJob?.taskErrors?.map((error) => error.error).join("; ") ??
      null,
    tasks,
  };
}

function groupSessionsByPatient(patients: BackendDoctorPatient[]): DoctorPatient[] {
  const patientsById = new Map<string, DoctorPatient>();

  patients.forEach((sourcePatient) => {
    const sessions = sourcePatient.sessions.map((session) => toSession(session));
    const patient = patientsById.get(sourcePatient.patientId) ?? {
      age: sourcePatient.age ?? 0,
      displayName: sourcePatient.patientName ?? sourcePatient.publicId ?? sourcePatient.patientId,
      id: sourcePatient.patientId,
      sessions: [],
    };

    patient.sessions.push(...sessions);
    patientsById.set(sourcePatient.patientId, patient);
  });

  return Array.from(patientsById.values())
    .map((patient) => ({
      ...patient,
      sessions: patient.sessions.sort(
        (current, next) => new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime(),
      ),
    }))
    .sort((current, next) => {
      const currentLatest = current.sessions[0]?.createdAt ?? "";
      const nextLatest = next.sessions[0]?.createdAt ?? "";
      if (!currentLatest && !nextLatest) return current.displayName.localeCompare(next.displayName);
      if (!currentLatest) return 1;
      if (!nextLatest) return -1;
      return new Date(nextLatest).getTime() - new Date(currentLatest).getTime();
    });
}

export async function getDoctorPatients(): Promise<DoctorPatient[]> {
  const doctorToken = requireDoctorToken();
  const patients = await backendRequest<BackendDoctorPatient[]>("/doctor/patients", {
    authToken: doctorToken,
  });
  return groupSessionsByPatient(patients);
}

export async function createDoctorSession({
  instructions,
  patientId,
  taskCodes,
}: {
  instructions?: string;
  patientId: string;
  taskCodes: PatientMovementType[];
}) {
  const doctorToken = requireDoctorToken();
  return backendRequest<BackendSession>(`/doctor/patients/${patientId}/sessions`, {
    authToken: doctorToken,
    body: JSON.stringify({ instructions, taskCodes }),
    method: "POST",
  });
}

export async function getDoctorTaskVideoUrl(fileId: string) {
  return backendVideoUrl(fileId, requireDoctorToken());
}

export async function submitDoctorFeedback({
  clinicalSummary,
  exercisePlan,
  patientSummary,
  recommendations,
  retakeRequests,
  sessionId,
  taskNotes,
}: {
  clinicalSummary: string;
  exercisePlan: DoctorExercisePlan[];
  patientSummary: string;
  recommendations: string[];
  retakeRequests: DoctorRetakeRequest[];
  sessionId: string;
  taskNotes: DoctorTaskFeedback[];
}) {
  const doctorToken = requireDoctorToken();
  return backendRequest(`/doctor/sessions/${sessionId}/feedback`, {
    authToken: doctorToken,
    body: JSON.stringify({
      clinicalSummary,
      exercisePlan,
      patientSummary,
      recommendations,
      retakeRequests,
      taskNotes,
    }),
    method: "POST",
  });
}

export async function retryAnalysisJob(jobId: string) {
  const doctorToken = requireDoctorToken();
  return backendRequest(`/analysis/jobs/${jobId}/retry`, {
    authToken: doctorToken,
    method: "POST",
  });
}
