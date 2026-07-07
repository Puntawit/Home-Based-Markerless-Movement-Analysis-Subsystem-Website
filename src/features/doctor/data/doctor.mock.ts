import type { PatientMovementType } from "@/features/patient/types/patient.types";

export type DoctorRiskLevel = "low" | "moderate" | "high" | "unknown";
export type EventSeverity = "info" | "warning" | "critical";

export type DoctorEventMarker = {
  frame: number;
  label: string;
  severity: EventSeverity;
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
  metrics: {
    label: string;
    value: string;
    tone: "slate" | "cyan" | "amber" | "rose";
  }[];
  chartData: {
    frame: number;
    knee: number;
    hip: number;
    symmetry: number;
  }[];
};

export type DoctorSession = {
  id: string;
  patientId: string;
  createdAt: string;
  status: "pending_review" | "reviewed" | "processing" | "analysis_failed";
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

const gaitChartData = [
  { frame: 0, knee: 12, hip: 8, symmetry: 93 },
  { frame: 20, knee: 34, hip: 16, symmetry: 89 },
  { frame: 40, knee: 66, hip: 29, symmetry: 82 },
  { frame: 60, knee: 62, hip: 27, symmetry: 80 },
  { frame: 80, knee: 38, hip: 18, symmetry: 86 },
  { frame: 100, knee: 16, hip: 10, symmetry: 91 },
];

const sitChartData = [
  { frame: 0, knee: 88, hip: 72, symmetry: 88 },
  { frame: 20, knee: 76, hip: 64, symmetry: 84 },
  { frame: 40, knee: 48, hip: 38, symmetry: 80 },
  { frame: 60, knee: 52, hip: 42, symmetry: 79 },
  { frame: 80, knee: 78, hip: 62, symmetry: 83 },
  { frame: 100, knee: 90, hip: 74, symmetry: 86 },
];

const balanceChartData = [
  { frame: 0, knee: 8, hip: 6, symmetry: 86 },
  { frame: 20, knee: 12, hip: 11, symmetry: 82 },
  { frame: 40, knee: 16, hip: 18, symmetry: 76 },
  { frame: 60, knee: 14, hip: 24, symmetry: 74 },
  { frame: 80, knee: 10, hip: 19, symmetry: 78 },
  { frame: 100, knee: 9, hip: 12, symmetry: 83 },
];

const shoulderChartData = [
  { frame: 0, knee: 0, hip: 4, symmetry: 92 },
  { frame: 20, knee: 0, hip: 8, symmetry: 90 },
  { frame: 40, knee: 0, hip: 14, symmetry: 86 },
  { frame: 60, knee: 0, hip: 18, symmetry: 82 },
  { frame: 80, knee: 0, hip: 16, symmetry: 84 },
  { frame: 100, knee: 0, hip: 10, symmetry: 88 },
];

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
              { label: "Cadence", value: "94 spm", tone: "cyan" },
              { label: "Symmetry index", value: "91%", tone: "cyan" },
              { label: "Gait speed", value: "0.93 m/s", tone: "cyan" },
            ],
            chartData: gaitChartData,
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
              { label: "Completion", value: "5 reps", tone: "cyan" },
              { label: "Control", value: "Moderate", tone: "amber" },
              { label: "Concentric phase", value: "Slow", tone: "amber" },
            ],
            chartData: sitChartData,
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
              { label: "Balance score", value: "68/100", tone: "amber" },
              { label: "Symmetry index", value: "78%", tone: "amber" },
              { label: "Pelvic drop", value: "12.1 deg", tone: "rose" },
            ],
            chartData: balanceChartData,
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
              { label: "ROM", value: "151 deg", tone: "cyan" },
              { label: "Compensation", value: "Mild", tone: "amber" },
              { label: "Smoothness", value: "Good", tone: "cyan" },
            ],
            chartData: shoulderChartData,
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
              { label: "ROM", value: "122 deg", tone: "rose" },
              { label: "Compensation", value: "High", tone: "rose" },
              { label: "Pose quality", value: "Fair", tone: "amber" },
            ],
            chartData: shoulderChartData,
          },
        ],
      },
    ],
  },
];
