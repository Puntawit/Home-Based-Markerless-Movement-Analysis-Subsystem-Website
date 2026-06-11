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

export type PatientQualityGate = {
  orientation: "passed" | "warning";
  lighting: "passed" | "warning";
  distanceConfirmed: boolean;
};

export type DoctorFeedback = {
  id: string;
  doctorName: string;
  createdAt: string;
  summary: string;
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
  view: PatientViewType;
};
