import type { DoctorPatient, DoctorRiskLevel, DoctorSession, DoctorSessionTask } from "@/features/doctor/data/doctor.mock";
import type {
  DoctorExercisePlan,
  DoctorRetakeRequest,
  DoctorTaskFeedback,
  PatientMovementType,
} from "@/features/patient/types/patient.types";
import { backendRequest, backendVideoUrl, requireDoctorToken } from "@/lib/backendApi";

type BackendSessionTask = {
  taskId?: string;
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
      metrics?: { group: string; name: string; value: unknown }[];
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

const previewChartData = [
  { frame: 0, knee: 20, hip: 12, symmetry: 90 },
  { frame: 25, knee: 42, hip: 24, symmetry: 84 },
  { frame: 50, knee: 68, hip: 32, symmetry: 78 },
  { frame: 75, knee: 44, hip: 22, symmetry: 82 },
  { frame: 100, knee: 18, hip: 10, symmetry: 88 },
];

function mapSessionStatus(status: string): DoctorSession["status"] {
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
    id: task.taskId ?? task.id ?? task.movementType,
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
    metrics: (view?.metrics ?? []).slice(0, 6).map((metric) => ({
      label: metric.name.replace(/_/g, " "),
      value: String(metric.value),
      tone: mapMetricTone(metric.value),
    })),
    chartData: previewChartData,
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

function groupSessionsByPatient(sessions: BackendSession[]): DoctorPatient[] {
  const patientsById = new Map<string, DoctorPatient>();

  const mappedSessions = sessions.map((session) => ({
    source: session,
    session: toSession(session),
  }));

  mappedSessions.forEach(({ source, session }) => {
    const patient = patientsById.get(source.patientId) ?? {
      age: 0,
      displayName: source.patientName ?? source.patientId,
      id: source.patientId,
      sessions: [],
    };

    patient.sessions.push(session);
    patientsById.set(source.patientId, patient);
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
      return new Date(nextLatest).getTime() - new Date(currentLatest).getTime();
    });
}

export async function getDoctorPatients(): Promise<DoctorPatient[]> {
  const doctorToken = requireDoctorToken();
  const sessions = await backendRequest<BackendSession[]>("/doctor/sessions", {
    authToken: doctorToken,
  });
  return groupSessionsByPatient(sessions);
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
