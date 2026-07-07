import {
  Activity,
  Armchair,
  Footprints,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type {
  PatientMovementType,
  PatientViewType,
} from "@/features/patient/types/patient.types";

export type MovementTask = {
  id: PatientMovementType;
  label: string;
  shortLabel: string;
  description: string;
  view: PatientViewType;
  distance: string;
  durationSeconds: number;
  tutorialTitle: string;
  tutorialBody: string;
  safetyNote?: string;
  silhouette: "front" | "side-chair";
  icon: LucideIcon;
  symptomQuestions: SymptomQuestion[];
};

export type SymptomOption = {
  id: string;
  label: string;
};

export type SymptomQuestion = {
  bodyPartId: string;
  bodyPartLabel: string;
  options: SymptomOption[];
};

const commonJointOptions: SymptomOption[] = [
  { id: "none", label: "No symptoms" },
  { id: "pain", label: "Pain" },
  { id: "tight", label: "Tight/stiff" },
  { id: "weak", label: "Weak" },
  { id: "numb", label: "Numb/tingly" },
];

const safetyOptions: SymptomOption[] = [
  { id: "none", label: "No symptoms" },
  { id: "pain", label: "Pain" },
  { id: "dizzy", label: "Dizzy" },
  { id: "unsafe", label: "Felt unsafe" },
];

export const legacyMovementTaskLabels: Partial<Record<PatientMovementType, string>> = {
  gait_walk: "Gait Walk",
  shoulder_flexion: "Shoulder Flexion",
  single_leg_stance: "Single Leg Stance",
  sit_to_stand: "Sit to Stand",
  stair_task: "Stair Task",
};

export const movementTasks: MovementTask[] = [
  {
    id: "hip_flexion",
    label: "Hip Flexion",
    shortLabel: "Hip Flexion",
    description: "Sit side-on to the camera and lift one knee toward the chest as high as comfortable.",
    view: "side",
    distance: "Place the camera about 1.5-2 m away at hip height, side to your chair.",
    durationSeconds: 10,
    tutorialTitle: "Seated knee lift for hip flexion",
    tutorialBody:
      "Sit tall in a sturdy chair with both feet flat. Keep your trunk upright, then lift one knee toward your chest as high as comfortable. The system reads the trunk-to-thigh angle from the side view.",
    safetyNote:
      "Stay seated throughout this task. Do not stand up or lean back hard to force the movement.",
    silhouette: "side-chair",
    icon: Armchair,
    symptomQuestions: [
      { bodyPartId: "hip", bodyPartLabel: "Hip", options: commonJointOptions },
      { bodyPartId: "thigh", bodyPartLabel: "Thigh", options: commonJointOptions },
      { bodyPartId: "back", bodyPartLabel: "Lower back", options: commonJointOptions },
    ],
  },
  {
    id: "hip_extension",
    label: "Hip Extension",
    shortLabel: "Hip Extension",
    description: "Lie face-down, keep the leg straight, and lift one straight leg off the surface.",
    view: "side",
    distance: "Place the camera about 1.5-2 m away at bed or mat height, side to your body.",
    durationSeconds: 10,
    tutorialTitle: "Prone straight-leg lift for hip extension",
    tutorialBody:
      "Lie face-down on a bed or mat with both legs straight. Lift one straight leg gently off the surface without bending the knee. If lying prone is difficult, stand facing a counter with both hands supported and gently swing one leg back.",
    safetyNote:
      "Use the prone version when possible. For the standing alternative, keep both hands on a stable counter and stop if you feel unsafe.",
    silhouette: "side-chair",
    icon: Activity,
    symptomQuestions: [
      { bodyPartId: "hip", bodyPartLabel: "Hip", options: commonJointOptions },
      { bodyPartId: "thigh", bodyPartLabel: "Thigh", options: commonJointOptions },
      { bodyPartId: "back", bodyPartLabel: "Lower back", options: commonJointOptions },
      { bodyPartId: "safety", bodyPartLabel: "Safety", options: safetyOptions },
    ],
  },
  {
    id: "knee_flexion",
    label: "Knee Flexion",
    shortLabel: "Knee Flexion",
    description: "Sit on the edge of a bed or table with thighs supported, then bend the knee to draw the heel back.",
    view: "side",
    distance: "Place the camera about 1.5-2 m away, side to the tested leg.",
    durationSeconds: 10,
    tutorialTitle: "Seated edge knee bend",
    tutorialBody:
      "Sit on the edge of a bed or stable table. Keep your thigh supported and let the lower leg hang. Bend the knee to draw the heel back under you while staying stable and supported.",
    safetyNote:
      "Make sure the bed or table is stable before starting. Keep your hands supported if needed.",
    silhouette: "side-chair",
    icon: Armchair,
    symptomQuestions: [
      { bodyPartId: "knee", bodyPartLabel: "Knee", options: commonJointOptions },
      { bodyPartId: "thigh", bodyPartLabel: "Thigh", options: commonJointOptions },
      { bodyPartId: "calf", bodyPartLabel: "Calf", options: commonJointOptions },
    ],
  },
  {
    id: "knee_extension",
    label: "Knee Extension",
    shortLabel: "Knee Extension",
    description: "From the same seated edge position, straighten the lower leg out toward horizontal.",
    view: "side",
    distance: "Place the camera about 1.5-2 m away, side to the tested leg.",
    durationSeconds: 10,
    tutorialTitle: "Seated edge knee straightening",
    tutorialBody:
      "Sit on the edge of a bed or stable table with your thigh supported. Slowly straighten the lower leg toward horizontal, then relax. The system reads the thigh-to-shank angle as the knee returns toward straight.",
    safetyNote:
      "Do not kick quickly. Move slowly and stop if knee pain increases.",
    silhouette: "side-chair",
    icon: Footprints,
    symptomQuestions: [
      { bodyPartId: "knee", bodyPartLabel: "Knee", options: commonJointOptions },
      { bodyPartId: "thigh", bodyPartLabel: "Thigh", options: commonJointOptions },
      { bodyPartId: "calf", bodyPartLabel: "Calf", options: commonJointOptions },
    ],
  },
  {
    id: "ankle_dorsiflexion",
    label: "Ankle Dorsiflexion",
    shortLabel: "Dorsiflexion",
    description: "Sit with the foot flat, keep the heel on the floor, and lift the toes up toward the shin.",
    view: "side",
    distance: "Place the camera about 1-1.5 m away, side to the tested foot and ankle.",
    durationSeconds: 8,
    tutorialTitle: "Seated toe lift with heel down",
    tutorialBody:
      "Sit in a chair with your foot flat on the floor. Keep the heel planted and lift the toes and forefoot up toward the shin. This replaces the standing knee-to-wall lunge for a safer shank-to-foot angle.",
    safetyNote:
      "Keep the heel on the floor and stay seated. No standing lunge is needed.",
    silhouette: "side-chair",
    icon: ShieldAlert,
    symptomQuestions: [
      { bodyPartId: "ankle", bodyPartLabel: "Ankle", options: commonJointOptions },
      { bodyPartId: "foot", bodyPartLabel: "Foot", options: commonJointOptions },
      { bodyPartId: "calf", bodyPartLabel: "Calf", options: commonJointOptions },
    ],
  },
  {
    id: "ankle_plantarflexion",
    label: "Ankle Plantarflexion",
    shortLabel: "Plantarflexion",
    description: "Sit with the foot lifted slightly off the floor, then point the toes down as far as comfortable.",
    view: "side",
    distance: "Place the camera about 1-1.5 m away, side to the tested foot and ankle.",
    durationSeconds: 8,
    tutorialTitle: "Seated toe point without heel raise",
    tutorialBody:
      "Sit in a chair and lift the tested foot slightly off the floor. Point the toes down as far as comfortable while the shank stays visible. The system reads the shank-to-foot angle.",
    safetyNote:
      "Do not perform a standing heel raise. This task should stay seated to avoid fall risk.",
    silhouette: "side-chair",
    icon: Footprints,
    symptomQuestions: [
      { bodyPartId: "ankle", bodyPartLabel: "Ankle", options: commonJointOptions },
      { bodyPartId: "foot", bodyPartLabel: "Foot", options: commonJointOptions },
      { bodyPartId: "calf", bodyPartLabel: "Calf", options: commonJointOptions },
    ],
  },
];

export const movementTaskMap = movementTasks.reduce(
  (acc, task) => {
    acc[task.id] = task;
    return acc;
  },
  {} as Partial<Record<PatientMovementType, MovementTask>>,
);

export function getMovementTask(taskId: string | null | undefined) {
  if (taskId && taskId in movementTaskMap) {
    return movementTaskMap[taskId as PatientMovementType] ?? movementTasks[0];
  }

  return movementTasks[0];
}

export function getMovementTaskLabel(taskId: PatientMovementType) {
  return movementTaskMap[taskId]?.label ?? legacyMovementTaskLabels[taskId] ?? taskId.replace(/_/g, " ");
}
