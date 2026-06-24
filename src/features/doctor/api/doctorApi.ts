import {
  doctorPatientsMock,
  type DoctorPatient,
  type DoctorRiskLevel,
  type DoctorSession,
  type DoctorSessionTask,
} from "@/features/doctor/data/doctor.mock";
import type { PatientMovementType } from "@/features/patient/types/patient.types";
import { backendRequest, backendVideoUrl, ensureDoctorToken } from "@/lib/backendApi";

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
};

const taskLabels: Record<PatientMovementType, string> = {
  gait_walk: "Gait Walk",
  shoulder_flexion: "Shoulder Flexion",
  single_leg_stance: "Single Leg Stance",
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
  return "pending_review";
}

function mapMetricTone(value: unknown): "slate" | "cyan" | "amber" | "rose" {
  if (typeof value === "boolean") return value ? "amber" : "cyan";
  if (typeof value === "number" && value > 100) return "amber";
  return "cyan";
}

function toTask(task: BackendSessionTask, videoToken: string): DoctorSessionTask & { videoUrl?: string } {
  const view = task.analysisResult?.doctorView;
  const riskLevel = view?.riskLevel ?? "low";
  const flags = view?.flags?.length ? view.flags : ["Waiting for MediaPipe result"];

  return {
    id: task.taskId ?? task.id ?? task.movementType,
    movementType: task.movementType,
    taskLabel: task.taskLabel ?? taskLabels[task.movementType],
    riskLevel,
    confidence: view?.confidence ?? 0,
    qualityScore: view?.qualityScore ?? 0,
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
    videoUrl: task.fileId ? backendVideoUrl(task.fileId, videoToken) : undefined,
  };
}

function toPatient(session: BackendSession, videoToken: string): DoctorPatient {
  const tasks = session.tasks.map((task) => toTask(task, videoToken));
  const highestRisk = tasks.some((task) => task.riskLevel === "high")
    ? "high"
    : tasks.some((task) => task.riskLevel === "moderate")
      ? "moderate"
      : "low";

  return {
    id: session.patientId,
    displayName: session.patientName ?? session.patientId,
    age: 0,
    sessions: [
      {
        id: session.sessionId ?? session.id ?? "session",
        patientId: session.patientId,
        createdAt: session.submittedAt ?? session.createdAt,
        status: mapSessionStatus(session.status),
        riskLevel: highestRisk,
        tasks,
      },
    ],
  };
}

export async function getDoctorPatients(): Promise<DoctorPatient[]> {
  const doctorToken = await ensureDoctorToken();
  const sessions = await backendRequest<BackendSession[]>("/doctor/sessions", {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  if (sessions.length === 0) return doctorPatientsMock;
  return sessions.map((session) => toPatient(session, doctorToken));
}

export async function submitDoctorFeedback({
  clinicalSummary,
  patientSummary,
  sessionId,
}: {
  clinicalSummary: string;
  patientSummary: string;
  sessionId: string;
}) {
  const doctorToken = await ensureDoctorToken();
  return backendRequest(`/doctor/sessions/${sessionId}/feedback`, {
    body: JSON.stringify({
      clinicalSummary,
      exercisePlan: [],
      patientSummary,
      recommendations: [],
      retakeRequests: [],
      taskNotes: [],
    }),
    headers: { Authorization: `Bearer ${doctorToken}` },
    method: "POST",
  });
}
