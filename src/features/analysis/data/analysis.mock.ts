import type {
  AnalysisIssue,
  AnalysisSession,
  MovementChartData,
  MovementMetric,
  MovementType,
} from "@/features/analysis/types/analysis.types";

export function createMockMetrics(movementType: MovementType): MovementMetric[] {
  const sharedMetrics: MovementMetric[] = [
    { id: "left-knee-angle", name: "Left Knee Angle", value: 92, unit: "deg", status: "good" },
    { id: "right-knee-angle", name: "Right Knee Angle", value: 88, unit: "deg", status: "warning" },
    { id: "hip-angle", name: "Hip Angle", value: 61, unit: "deg", status: "good" },
    { id: "shoulder-angle", name: "Shoulder Angle", value: 74, unit: "deg", status: "good" },
    { id: "movement-speed", name: "Movement Speed", value: 1.2, unit: "m/s", status: "good" },
    { id: "stability-score", name: "Stability Score", value: 81, unit: "%", status: "good" },
    { id: "balance-score", name: "Balance Score", value: 76, unit: "%", status: "warning" },
    { id: "range-of-motion", name: "Range of Motion", value: 68, unit: "deg", status: "good" },
    { id: "left-right-symmetry", name: "Left-Right Symmetry", value: 84, unit: "%", status: "good" },
  ];

  if (movementType === "walk") {
    return sharedMetrics.map((metric) =>
      metric.id === "movement-speed" ? { ...metric, value: 1.05, status: "warning" } : metric,
    );
  }

  if (movementType === "arm_raise") {
    return sharedMetrics.map((metric) =>
      metric.id === "shoulder-angle" ? { ...metric, value: 131, status: "good" } : metric,
    );
  }

  return sharedMetrics;
}

export function createMockIssues(movementType: MovementType): AnalysisIssue[] {
  if (movementType === "walk") {
    return [
      {
        id: "short-step",
        title: "Short right step detected",
        description: "Right side step length is lower than the left side during mid-stance.",
        severity: "medium",
      },
      {
        id: "trunk-lean",
        title: "Mild trunk lean",
        description: "Upper body leans forward during the last part of the movement.",
        severity: "low",
      },
    ];
  }

  return [
    {
      id: "knee-valgus",
      title: "Right knee drifts inward",
      description: "The right knee moves inward during the lowering phase.",
      severity: "medium",
    },
    {
      id: "stability-drop",
      title: "Small stability drop",
      description: "Balance score decreases near the end of the repetition.",
      severity: "low",
    },
  ];
}

export function createMockRecommendations(movementType: MovementType): string[] {
  if (movementType === "arm_raise") {
    return [
      "Keep the shoulder relaxed before starting the raise.",
      "Move at a slower pace to improve control.",
      "Repeat the analysis from a side camera angle for better review.",
    ];
  }

  if (movementType === "walk") {
    return [
      "Focus on even step length between left and right sides.",
      "Keep the trunk upright during mid-stance.",
      "Record another session with the full body visible.",
    ];
  }

  return [
    "Keep both knees aligned with the feet during the movement.",
    "Pause briefly at the bottom position before standing up.",
    "Try one more recording with brighter lighting.",
  ];
}

export function createMockChartData(offset = 0): MovementChartData[] {
  return Array.from({ length: 14 }, (_, index) => {
    const time = index * 0.4;
    return {
      time,
      leftKnee: Math.round(55 + Math.sin(index / 2) * 24 + offset),
      rightKnee: Math.round(53 + Math.sin(index / 2 + 0.2) * 23 + offset),
      hip: Math.round(42 + Math.sin(index / 2 + 0.7) * 18),
      shoulder: Math.round(70 + Math.cos(index / 2) * 14),
      speed: Number((0.8 + Math.sin(index / 3) * 0.25).toFixed(2)),
    };
  });
}

export const analysisSessionsMock: AnalysisSession[] = [
  {
    id: "ana-1001",
    name: "Morning squat baseline",
    movementType: "squat",
    status: "completed",
    createdAt: "2026-06-06T09:20:00+07:00",
    score: 86,
    summary:
      "Movement pattern is mostly controlled. Right knee alignment needs small improvement during the lowering phase.",
    note: "Baseline test before rehab program.",
    metrics: createMockMetrics("squat"),
    issues: createMockIssues("squat"),
    recommendations: createMockRecommendations("squat"),
    chartData: createMockChartData(0),
  },
  {
    id: "ana-1002",
    name: "Gait review after warmup",
    movementType: "walk",
    status: "completed",
    createdAt: "2026-06-05T15:05:00+07:00",
    score: 78,
    summary:
      "Walking pattern shows mild asymmetry. Step timing is stable, but right step length is shorter.",
    metrics: createMockMetrics("walk"),
    issues: createMockIssues("walk"),
    recommendations: createMockRecommendations("walk"),
    chartData: createMockChartData(-4),
  },
  {
    id: "ana-1003",
    name: "Arm raise mobility check",
    movementType: "arm_raise",
    status: "completed",
    createdAt: "2026-06-04T10:35:00+07:00",
    score: 91,
    summary:
      "Shoulder range is strong and stable. Movement speed is consistent across the session.",
    metrics: createMockMetrics("arm_raise"),
    issues: [
      {
        id: "fast-start",
        title: "Fast start",
        description: "Initial lift speed is higher than the rest of the movement.",
        severity: "low",
      },
    ],
    recommendations: createMockRecommendations("arm_raise"),
    chartData: createMockChartData(8),
  },
  {
    id: "ana-1004",
    name: "Jump landing test",
    movementType: "jump",
    status: "processing",
    createdAt: "2026-06-07T18:10:00+07:00",
    summary: "Analysis is still processing. Results will be available soon.",
    chartData: createMockChartData(3),
  },
  {
    id: "ana-1005",
    name: "Evening squat retry",
    movementType: "squat",
    status: "failed",
    createdAt: "2026-06-03T19:30:00+07:00",
    summary: "Video quality was too low to complete pose estimation.",
  },
];
