import type { PatientMovementType } from "@/features/patient/types/patient.types";

export type DoctorRiskLevel = "low" | "moderate" | "high";

export type DoctorSessionTask = {
  id: string;
  movementType: PatientMovementType;
  taskLabel: string;
  riskLevel: DoctorRiskLevel;
  confidence: number;
  flags: string[];
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
  status: "pending_review" | "reviewed" | "processing";
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

const balanceChartData = [
  { frame: 0, knee: 8, hip: 6, symmetry: 86 },
  { frame: 20, knee: 12, hip: 11, symmetry: 82 },
  { frame: 40, knee: 16, hip: 18, symmetry: 76 },
  { frame: 60, knee: 14, hip: 24, symmetry: 74 },
  { frame: 80, knee: 10, hip: 19, symmetry: 78 },
  { frame: 100, knee: 9, hip: 12, symmetry: 83 },
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
            flags: ["No major gait abnormality"],
            metrics: [
              { label: "Cadence", value: "94 spm", tone: "cyan" },
              { label: "Symmetry index", value: "91%", tone: "cyan" },
              { label: "Pose quality", value: "Good", tone: "cyan" },
            ],
            chartData: gaitChartData,
          },
          {
            id: "task-7712-sit",
            movementType: "sit_to_stand",
            taskLabel: "ลุก-นั่งจากเก้าอี้ 5 ครั้ง",
            riskLevel: "moderate",
            confidence: 74,
            flags: ["Knee valgus tendency", "Slow concentric phase"],
            metrics: [
              { label: "Completion", value: "5 reps", tone: "cyan" },
              { label: "Control", value: "Moderate", tone: "amber" },
              { label: "Pose quality", value: "Good", tone: "cyan" },
            ],
            chartData: gaitChartData,
          },
          {
            id: "task-7712-leg",
            movementType: "single_leg_stance",
            taskLabel: "ยืนขาเดียว",
            riskLevel: "moderate",
            confidence: 76,
            flags: [
              "Pelvic Drop / Possible Trendelenburg Sign",
              "Center of mass drift detected",
            ],
            metrics: [
              { label: "Balance score", value: "68/100", tone: "amber" },
              { label: "Symmetry index", value: "78%", tone: "amber" },
              { label: "Pose quality", value: "Good", tone: "cyan" },
            ],
            chartData: balanceChartData,
          },
          {
            id: "task-7712-shoulder",
            movementType: "shoulder_flexion",
            taskLabel: "ยกแขนขึ้นเหนือหัว",
            riskLevel: "low",
            confidence: 83,
            flags: ["Mild trunk compensation"],
            metrics: [
              { label: "ROM", value: "151 deg", tone: "cyan" },
              { label: "Compensation", value: "Mild", tone: "amber" },
              { label: "Pose quality", value: "Good", tone: "cyan" },
            ],
            chartData: gaitChartData,
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
            flags: ["Trunk Compensation Detected", "Limited shoulder flexion range"],
            metrics: [
              { label: "ROM", value: "122 deg", tone: "rose" },
              { label: "Compensation", value: "High", tone: "rose" },
              { label: "Pose quality", value: "Fair", tone: "amber" },
            ],
            chartData: balanceChartData,
          },
        ],
      },
    ],
  },
];
