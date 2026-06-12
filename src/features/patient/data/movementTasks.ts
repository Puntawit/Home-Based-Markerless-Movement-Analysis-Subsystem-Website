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
  { id: "none", label: "ไม่มีอาการ" },
  { id: "pain", label: "ปวด" },
  { id: "tight", label: "ตึง/ฝืด" },
  { id: "weak", label: "อ่อนแรง" },
  { id: "numb", label: "ชา/เสียว" },
];

const balanceOptions: SymptomOption[] = [
  { id: "none", label: "ไม่มีอาการ" },
  { id: "unstable", label: "ไม่มั่นคง" },
  { id: "pain", label: "ปวด" },
  { id: "weak", label: "อ่อนแรง" },
  { id: "dizzy", label: "เวียนหัว" },
];

export const movementTasks: MovementTask[] = [
  {
    id: "gait_walk",
    label: "เดินตรง 5 เมตร",
    shortLabel: "Gait Walk",
    description: "หันหน้าตรง เดินให้เห็นทั้งตัวตั้งแต่เริ่มจนจบทางเดิน",
    view: "front",
    distance: "ตั้งกล้องห่างประมาณ 2.5-3 เมตร และให้เห็นเท้ากับศีรษะครบ",
    durationSeconds: 15,
    tutorialTitle: "เดินตรงช้า ๆ ให้กล้องเห็นเต็มตัว",
    tutorialBody:
      "ตั้งโทรศัพท์ให้นิ่ง เห็นตั้งแต่ศีรษะถึงเท้า วางกระดาษ A4 บนพื้นให้เห็นชัด แล้วเดินตรงในจังหวะปกติ",
    silhouette: "front",
    icon: Footprints,
    symptomQuestions: [
      { bodyPartId: "hip", bodyPartLabel: "สะโพก", options: commonJointOptions },
      { bodyPartId: "knee", bodyPartLabel: "เข่า", options: commonJointOptions },
      { bodyPartId: "ankle", bodyPartLabel: "ข้อเท้า", options: commonJointOptions },
      { bodyPartId: "foot", bodyPartLabel: "เท้า", options: commonJointOptions },
    ],
  },
  {
    id: "sit_to_stand",
    label: "ลุก-นั่งจากเก้าอี้ 5 ครั้ง",
    shortLabel: "Sit to Stand",
    description: "หันข้างให้กล้อง เห็นเก้าอี้ ลำตัว เข่า และเท้าชัดเจน",
    view: "side",
    distance: "ตั้งกล้องห่างประมาณ 2 เมตร และให้เก้าอี้อยู่ในกรอบตลอด",
    durationSeconds: 12,
    tutorialTitle: "ลุกขึ้นและนั่งลงต่อเนื่อง 5 ครั้ง",
    tutorialBody:
      "วางเก้าอี้ด้านข้างกล้อง ลุกและนั่งด้วยจังหวะสม่ำเสมอโดยไม่รีบ และอย่าให้เข่าหรือเท้าหลุดจากกรอบ",
    silhouette: "side-chair",
    icon: Armchair,
    symptomQuestions: [
      { bodyPartId: "hip", bodyPartLabel: "สะโพก", options: commonJointOptions },
      { bodyPartId: "thigh", bodyPartLabel: "ต้นขา", options: commonJointOptions },
      { bodyPartId: "knee", bodyPartLabel: "เข่า", options: commonJointOptions },
      { bodyPartId: "back", bodyPartLabel: "หลังส่วนล่าง", options: commonJointOptions },
    ],
  },
  {
    id: "single_leg_stance",
    label: "ยืนขาเดียว",
    shortLabel: "Single Leg",
    description: "หันหน้าตรง มีผู้ดูแลหรือเก้าอี้ใกล้ตัวเพื่อความปลอดภัย",
    view: "front",
    distance: "ตั้งกล้องห่างประมาณ 2.5 เมตร เห็นสะโพก เข่า และเท้าทั้งสองข้าง",
    durationSeconds: 10,
    tutorialTitle: "ยืนขาเดียวโดยควบคุมการทรงตัว",
    tutorialBody:
      "ยืนให้เต็มตัวอยู่ในกรอบ ยกขาข้างหนึ่งขึ้นเล็กน้อย แล้วค้างไว้เท่าที่ปลอดภัย ถ้าเสียการทรงตัวให้จับเก้าอี้ทันที",
    safetyNote:
      "คำเตือน: ควรมีผู้ดูแลอยู่ใกล้ ๆ และวางเก้าอี้ไว้ด้านข้างเพื่อพยุงตัว",
    silhouette: "front",
    icon: ShieldAlert,
    symptomQuestions: [
      { bodyPartId: "balance", bodyPartLabel: "การทรงตัว", options: balanceOptions },
      { bodyPartId: "hip", bodyPartLabel: "สะโพก", options: commonJointOptions },
      { bodyPartId: "knee", bodyPartLabel: "เข่า", options: commonJointOptions },
      { bodyPartId: "ankle", bodyPartLabel: "ข้อเท้า", options: commonJointOptions },
    ],
  },
  {
    id: "shoulder_flexion",
    label: "ยกแขนขึ้นเหนือหัว",
    shortLabel: "Shoulder Flexion",
    description: "ถ่ายวิดีโอเดียวเพื่อดูมุมไหล่และการชดเชยลำตัว",
    view: "front_and_side",
    distance: "ตั้งกล้องห่างประมาณ 2 เมตร เห็นลำตัว แขน และศีรษะครบ",
    durationSeconds: 12,
    tutorialTitle: "ยกแขนขึ้นเหนือหัวช้า ๆ",
    tutorialBody:
      "ยืนตัวตรง ยกแขนขึ้นเหนือหัวช้า ๆ และพยายามไม่เอนลำตัวช่วย ถ้ามีอาการเจ็บให้หยุดทันที",
    silhouette: "side-chair",
    icon: Activity,
    symptomQuestions: [
      { bodyPartId: "shoulder", bodyPartLabel: "ไหล่", options: commonJointOptions },
      { bodyPartId: "upper_arm", bodyPartLabel: "ต้นแขน", options: commonJointOptions },
      { bodyPartId: "neck", bodyPartLabel: "คอ", options: commonJointOptions },
      { bodyPartId: "back", bodyPartLabel: "หลัง/ลำตัว", options: commonJointOptions },
    ],
  },
];

export const movementTaskMap = movementTasks.reduce(
  (acc, task) => {
    acc[task.id] = task;
    return acc;
  },
  {} as Record<PatientMovementType, MovementTask>,
);

export function getMovementTask(taskId: string | null | undefined) {
  if (taskId && taskId in movementTaskMap) {
    return movementTaskMap[taskId as PatientMovementType];
  }

  return movementTasks[0];
}
