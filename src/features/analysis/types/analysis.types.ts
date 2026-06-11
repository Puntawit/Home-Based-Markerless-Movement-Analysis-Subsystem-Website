export type MovementType = "squat" | "walk" | "jump" | "arm_raise";

export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

export type MetricStatus = "good" | "warning" | "bad";

export type IssueSeverity = "low" | "medium" | "high";

export type ProcessingState = "idle" | "uploading" | "uploaded" | "processing" | "success" | "error";

export type AnalysisSession = {
  id: string;
  name: string;
  movementType: MovementType;
  status: AnalysisStatus;
  createdAt: string;
  videoUrl?: string;
  score?: number;
  summary?: string;
  note?: string;
  metrics?: MovementMetric[];
  issues?: AnalysisIssue[];
  recommendations?: string[];
  chartData?: MovementChartData[];
};

export type MovementMetric = {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: MetricStatus;
};

export type AnalysisIssue = {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
};

export type MovementChartData = {
  time: number;
  leftKnee?: number;
  rightKnee?: number;
  hip?: number;
  shoulder?: number;
  speed?: number;
};

export type CreateAnalysisSessionPayload = {
  name: string;
  movementType: MovementType;
  note?: string;
  videoUrl?: string;
};

export const movementTypeLabels: Record<MovementType, string> = {
  squat: "Squat",
  walk: "Walk",
  jump: "Jump",
  arm_raise: "Arm Raise",
};

export const analysisStatusLabels: Record<AnalysisStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};
