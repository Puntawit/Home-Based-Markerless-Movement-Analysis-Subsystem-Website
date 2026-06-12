import {
  createEmptySessionTasks,
  defaultQualityGate,
  demoPatient,
  latestDoctorFeedbackMock,
  patientSessionsMock,
} from "@/features/patient/data/patient.mock";
import type {
  DoctorFeedback,
  PatientSession,
  PatientSessionTask,
  SavePatientSessionTaskPayload,
} from "@/features/patient/types/patient.types";

let submittedSessions: PatientSession[] = [...patientSessionsMock];
let draftSession: PatientSession = createDraftSession();

function delay(ms = 350) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createDraftSession(): PatientSession {
  return {
    id: `draft-${demoPatient.id}`,
    patientName: demoPatient.displayName,
    patientId: demoPatient.id,
    status: "draft",
    createdAt: new Date().toISOString(),
    tasks: createEmptySessionTasks(),
  };
}

function sortByNewest(items: PatientSession[]) {
  return [...items].sort(
    (a, b) => new Date(b.submittedAt ?? b.createdAt).getTime() - new Date(a.submittedAt ?? a.createdAt).getTime(),
  );
}

function getCompletedTaskCount(tasks: PatientSessionTask[]) {
  return tasks.filter((task) => task.status === "recorded" && Boolean(task.fileName)).length;
}

function refreshDraftStatus() {
  draftSession.status = getCompletedTaskCount(draftSession.tasks) === draftSession.tasks.length
    ? "ready_to_submit"
    : "draft";
}

export async function mockLogin() {
  await delay(300);
  return { patientName: demoPatient.displayName, patientId: demoPatient.id };
}

export async function getPatientDraftSession() {
  await delay(250);
  refreshDraftStatus();
  return clone(draftSession);
}

export async function getLatestPatientSession() {
  await delay(250);
  return clone(sortByNewest(submittedSessions)[0]);
}

export async function savePatientSessionTask(payload: SavePatientSessionTaskPayload) {
  await delay(550);

  const nextTasks = draftSession.tasks.map((task) => {
    if (task.movementType !== payload.movementType) return task;

    return {
      ...task,
      status: "recorded" as const,
      view: payload.view,
      videoUrl: payload.videoUrl,
      fileName: payload.fileName,
      note: payload.note,
      symptomReport: payload.symptomReport,
      quality: payload.quality ?? defaultQualityGate,
      updatedAt: new Date().toISOString(),
    };
  });

  draftSession = {
    ...draftSession,
    tasks: nextTasks,
  };
  refreshDraftStatus();

  return clone(draftSession);
}

export async function submitPatientSession() {
  await delay(800);
  refreshDraftStatus();

  if (draftSession.status !== "ready_to_submit") {
    throw new Error("Please complete all 4 movement videos before submitting.");
  }

  const now = new Date().toISOString();
  const submittedSession: PatientSession = {
    ...draftSession,
    id: `pat-sess-${Date.now()}`,
    status: "waiting_doctor",
    submittedAt: now,
    tasks: draftSession.tasks.map((task) => ({
      ...task,
      id: `task-${Date.now()}-${task.movementType}`,
    })),
  };

  submittedSessions = [submittedSession, ...submittedSessions];
  draftSession = createDraftSession();

  return clone(submittedSession);
}

export async function getPatientSessionStatus(sessionId: string) {
  await delay(250);
  const session = submittedSessions.find((item) => item.id === sessionId);
  return clone(session?.status ?? "waiting_doctor");
}

export async function getLatestDoctorFeedback(): Promise<DoctorFeedback> {
  await delay(250);
  const sessionFeedback = sortByNewest(submittedSessions).find((item) => item.feedback)?.feedback;
  return clone(sessionFeedback ?? latestDoctorFeedbackMock);
}
