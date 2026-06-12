export type PatientMovementType =
  | "gait_walk"
  | "sit_to_stand"
  | "single_leg_stance"
  | "shoulder_flexion";

export type PatientSessionStatus =
  | "draft"
  | "ready_to_submit"
  | "waiting_doctor"
  | "feedback_ready";

export type PatientSessionTaskStatus = "not_started" | "recorded" | "needs_retake";

export type PatientViewType = "front" | "side" | "front_and_side";

export type QualityCheckStatus = "passed" | "warning";

export type PatientQualityGate = {
  calibrationMethod: "a4_reference";
  calibrationVisible: boolean;
  bodyFraming: QualityCheckStatus;
  lighting: QualityCheckStatus;
  cameraAngle: QualityCheckStatus;
  occlusion: QualityCheckStatus;
  distanceConfirmed: boolean;
  qualityScore: number;
  issues: string[];
};

export type PatientSymptomReportItem = {
  bodyPartId: string;
  bodyPartLabel: string;
  symptomId: string;
  symptomLabel: string;
};

export type PatientSymptomReport = {
  items: PatientSymptomReportItem[];
  additionalNote?: string;
};

export type DoctorFeedbackSeverity = "low" | "moderate" | "high";

export type DoctorTaskFeedback = {
  movementType: PatientMovementType;
  severity: DoctorFeedbackSeverity;
  title: string;
  clinicalNote: string;
  patientAction: string;
};

export type DoctorExercisePlan = {
  id: string;
  title: string;
  frequency: string;
  sets: string;
  reps: string;
  safetyNote: string;
};

export type DoctorRetakeRequest = {
  movementType: PatientMovementType;
  reason: string;
  priority: DoctorFeedbackSeverity;
};

export type DoctorFollowUpPlan = {
  nextCheckIn: string;
  watchFor: string[];
  escalationNote: string;
};

export type DoctorFeedback = {
  id: string;
  doctorName: string;
  createdAt: string;
  summary: string;
  patientSummary: string;
  clinicalSummary: string;
  taskNotes: DoctorTaskFeedback[];
  exercisePlan: DoctorExercisePlan[];
  retakeRequests: DoctorRetakeRequest[];
  followUpPlan: DoctorFollowUpPlan;
  recommendations: string[];
};

export type PatientSessionTask = {
  id: string;
  movementType: PatientMovementType;
  status: PatientSessionTaskStatus;
  view: PatientViewType;
  videoUrl?: string;
  fileName?: string;
  note?: string;
  symptomReport?: PatientSymptomReport;
  quality?: PatientQualityGate;
  updatedAt?: string;
};

export type PatientSession = {
  id: string;
  patientName: string;
  patientId: string;
  status: PatientSessionStatus;
  createdAt: string;
  submittedAt?: string;
  tasks: PatientSessionTask[];
  feedback?: DoctorFeedback;
};

export type SavePatientSessionTaskPayload = {
  movementType: PatientMovementType;
  videoUrl?: string;
  fileName?: string;
  note?: string;
  symptomReport?: PatientSymptomReport;
  view: PatientViewType;
  quality?: PatientQualityGate;
};
