import {
  analysisSessionsMock,
  createMockChartData,
  createMockIssues,
  createMockMetrics,
  createMockRecommendations,
} from "@/features/analysis/data/analysis.mock";
import type {
  AnalysisSession,
  AnalysisStatus,
  CreateAnalysisSessionPayload,
} from "@/features/analysis/types/analysis.types";

let sessions: AnalysisSession[] = [...analysisSessionsMock];

function delay(ms = 500) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortByNewest(items: AnalysisSession[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getAnalysisSessions() {
  await delay(450);
  return clone(sortByNewest(sessions));
}

export async function getAnalysisSessionById(id: string) {
  await delay(400);
  const session = sessions.find((item) => item.id === id);
  if (!session) {
    throw new Error("Analysis session not found.");
  }
  return clone(session);
}

export async function createAnalysisSession(payload: CreateAnalysisSessionPayload) {
  await delay(650);

  const metrics = createMockMetrics(payload.movementType);
  const score = Math.round(
    metrics.reduce((total, metric) => {
      if (metric.status === "bad") return total + 58;
      if (metric.status === "warning") return total + 74;
      return total + 90;
    }, 0) / metrics.length,
  );

  const session: AnalysisSession = {
    id: `ana-${Date.now()}`,
    name: payload.name,
    movementType: payload.movementType,
    status: "completed",
    createdAt: new Date().toISOString(),
    videoUrl: payload.videoUrl,
    score,
    summary:
      "Mock analysis completed successfully. The movement is stable overall with a few areas for improvement.",
    note: payload.note,
    metrics,
    issues: createMockIssues(payload.movementType),
    recommendations: createMockRecommendations(payload.movementType),
    chartData: createMockChartData(),
  };

  sessions = [session, ...sessions];
  return clone(session);
}

export async function deleteAnalysisSession(id: string) {
  await delay(350);
  sessions = sessions.filter((session) => session.id !== id);
}

export async function getAnalysisStatus(id: string): Promise<AnalysisStatus> {
  await delay(300);
  const session = sessions.find((item) => item.id === id);
  if (!session) {
    return "failed";
  }
  return session.status;
}
