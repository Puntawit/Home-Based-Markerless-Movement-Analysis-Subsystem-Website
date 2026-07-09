import type { PatientMovementType } from "@/features/patient/types/patient.types";

export type DoctorRiskLevel = "low" | "moderate" | "high" | "unknown";
export type EventSeverity = "info" | "warning" | "critical";

export type DoctorEventMarker = {
  frame: number;
  label: string;
  severity: EventSeverity;
};

export type DoctorMetricGroup = "joint_angles" | "gait_parameters" | "compensation" | "smoothness" | "symmetry";

export type DoctorMetric = {
  group: DoctorMetricGroup;
  label: string;
  value: string;
  tone: "slate" | "cyan" | "amber" | "rose";
};

export type DoctorSessionTask = {
  id: string;
  movementType: PatientMovementType;
  taskLabel: string;
  fileId?: string;
  riskLevel: DoctorRiskLevel;
  confidence: number | null;
  qualityScore: number | null;
  qualityIssues: string[];
  recommendedAction: string;
  flags: string[];
  eventMarkers: DoctorEventMarker[];
  metrics: DoctorMetric[];
};

export type DoctorSession = {
  id: string;
  patientId: string;
  createdAt: string;
  status: "assigned" | "draft" | "ready_to_submit" | "pending_review" | "reviewed" | "processing" | "analysis_failed";
  analysisJobId?: string;
  analysisJobError?: string | null;
  riskLevel: DoctorRiskLevel;
  tasks: DoctorSessionTask[];
};

export type DoctorPatient = {
  id: string;
  displayName: string;
  age: number;
  sessions: DoctorSession[];
};

export const doctorPatientsMock: DoctorPatient[] = [
  {
    id: "PATIENT-7712",
    displayName: "Patient-7712",
    age: 67,
    sessions: [
      {
        id: "sess-7712-20260608",
        patientId: "PATIENT-7712",
        createdAt: "2026-06-08T09:12:00+07:00",
        status: "pending_review",
        riskLevel: "moderate",
        tasks: [
          {
            id: "task-7712-gait",
            movementType: "gait_walk",
            taskLabel: "เดินตรง 5 เมตร",
            riskLevel: "low",
            confidence: 88,
            qualityScore: 94,
            qualityIssues: [],
            recommendedAction: "No retake. Continue gait monitoring next session.",
            flags: ["No major gait abnormality"],
            eventMarkers: [
              { frame: 42, label: "Left stance phase", severity: "info" },
              { frame: 66, label: "Minor step width variation", severity: "info" },
            ],
            metrics: [
              { group: "gait_parameters", label: "Cadence", value: "94 spm", tone: "cyan" },
              { group: "gait_parameters", label: "Gait speed", value: "0.93 m/s", tone: "cyan" },
              { group: "symmetry", label: "Symmetry index", value: "91%", tone: "cyan" },
            ],
          },
          {
            id: "task-7712-sit",
            movementType: "sit_to_stand",
            taskLabel: "ลุก-นั่งจากเก้าอี้ 5 ครั้ง",
            riskLevel: "moderate",
            confidence: 74,
            qualityScore: 91,
            qualityIssues: [],
            recommendedAction: "Prescribe slow sit-to-stand control drill.",
            flags: ["Knee valgus tendency", "Slow concentric phase"],
            eventMarkers: [
              { frame: 38, label: "Knee valgus peak", severity: "warning" },
              { frame: 62, label: "Slow concentric phase", severity: "warning" },
            ],
            metrics: [
              { group: "joint_angles", label: "Completion", value: "5 reps", tone: "cyan" },
              { group: "compensation", label: "Control", value: "Moderate", tone: "amber" },
              { group: "smoothness", label: "Concentric phase", value: "Slow", tone: "amber" },
            ],
          },
          {
            id: "task-7712-leg",
            movementType: "single_leg_stance",
            taskLabel: "ยืนขาเดียว",
            riskLevel: "moderate",
            confidence: 76,
            qualityScore: 78,
            qualityIssues: ["Left foot occluded near the end of the clip"],
            recommendedAction: "Request retake and prescribe supported balance drill.",
            flags: [
              "Pelvic Drop / Possible Trendelenburg Sign",
              "Center of mass drift detected",
            ],
            eventMarkers: [
              { frame: 46, label: "Pelvic drop peak", severity: "warning" },
              { frame: 72, label: "Center of mass drift", severity: "warning" },
              { frame: 88, label: "Foot occlusion", severity: "critical" },
            ],
            metrics: [
              { group: "joint_angles", label: "Balance score", value: "68/100", tone: "amber" },
              { group: "symmetry", label: "Symmetry index", value: "78%", tone: "amber" },
              { group: "compensation", label: "Pelvic drop", value: "12.1 deg", tone: "rose" },
            ],
          },
          {
            id: "task-7712-shoulder",
            movementType: "shoulder_flexion",
            taskLabel: "ยกแขนขึ้นเหนือหัว",
            riskLevel: "low",
            confidence: 83,
            qualityScore: 90,
            qualityIssues: [],
            recommendedAction: "Coach trunk control during shoulder flexion.",
            flags: ["Mild trunk compensation"],
            eventMarkers: [
              { frame: 58, label: "Max shoulder flexion", severity: "info" },
              { frame: 76, label: "Mild trunk compensation", severity: "warning" },
            ],
            metrics: [
              { group: "joint_angles", label: "ROM", value: "151 deg", tone: "cyan" },
              { group: "compensation", label: "Compensation", value: "Mild", tone: "amber" },
              { group: "smoothness", label: "Smoothness", value: "Good", tone: "cyan" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "PATIENT-1844",
    displayName: "Patient-1844",
    age: 58,
    sessions: [
      {
        id: "sess-1844-20260607",
        patientId: "PATIENT-1844",
        createdAt: "2026-06-07T11:40:00+07:00",
        status: "processing",
        riskLevel: "high",
        tasks: [
          {
            id: "task-1844-shoulder",
            movementType: "shoulder_flexion",
            taskLabel: "ยกแขนขึ้นเหนือหัว",
            riskLevel: "high",
            confidence: 81,
            qualityScore: 86,
            qualityIssues: ["Trunk partially leaves frame at max flexion"],
            recommendedAction: "Review manually before sending exercise plan.",
            flags: ["Trunk Compensation Detected", "Limited shoulder flexion range"],
            eventMarkers: [
              { frame: 52, label: "Limited ROM", severity: "critical" },
              { frame: 70, label: "Trunk compensation", severity: "critical" },
            ],
            metrics: [
              { group: "joint_angles", label: "ROM", value: "122 deg", tone: "rose" },
              { group: "compensation", label: "Compensation", value: "High", tone: "rose" },
              { group: "smoothness", label: "Pose quality", value: "Fair", tone: "amber" },
            ],
          },
        ],
      },
    ],
  },
];
