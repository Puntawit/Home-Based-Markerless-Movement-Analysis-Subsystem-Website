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
};

export const movementTasks: MovementTask[] = [
  {
    id: "gait_walk",
    label: "เดินตรง 5 เมตร",
    shortLabel: "Gait Walk",
    description: "หันหน้าตรง เดินให้เห็นทั้งตัวตั้งแต่เริ่มจนจบทางเดิน",
    view: "front",
    distance: "ตั้งกล้องห่างประมาณ 2.5-3 เมตร",
    durationSeconds: 15,
    tutorialTitle: "เดินตรงช้า ๆ ให้กล้องเห็นเต็มตัว",
    tutorialBody:
      "ตั้งโทรศัพท์ให้นิ่ง เห็นตั้งแต่ศีรษะถึงเท้า แล้วเดินตรงเข้าหากล้องในจังหวะปกติ",
    silhouette: "front",
    icon: Footprints,
  },
  {
    id: "sit_to_stand",
    label: "ลุก-นั่งจากเก้าอี้ 5 ครั้ง",
    shortLabel: "Sit to Stand",
    description: "หันข้างให้กล้อง เห็นเก้าอี้และลำตัวชัดเจน",
    view: "side",
    distance: "ตั้งกล้องห่างประมาณ 2 เมตร",
    durationSeconds: 12,
    tutorialTitle: "ลุกขึ้นและนั่งลงติดต่อกัน 5 ครั้ง",
    tutorialBody:
      "วางเก้าอี้ด้านข้างกล้อง ลุกและนั่งด้วยจังหวะสม่ำเสมอโดยไม่รีบ",
    silhouette: "side-chair",
    icon: Armchair,
  },
  {
    id: "single_leg_stance",
    label: "ยืนขาเดียว",
    shortLabel: "Single Leg",
    description: "หันหน้าตรง มีผู้ดูแลหรือเก้าอี้ใกล้ตัวเพื่อความปลอดภัย",
    view: "front",
    distance: "ตั้งกล้องห่างประมาณ 2.5 เมตร",
    durationSeconds: 10,
    tutorialTitle: "ยืนขาเดียวโดยควบคุมการทรงตัว",
    tutorialBody:
      "ยืนให้เต็มตัวอยู่ในกรอบ ยกขาข้างหนึ่งขึ้นเล็กน้อย แล้วค้างไว้เท่าที่ปลอดภัย",
    safetyNote:
      "คำเตือน: ควรมีผู้ดูแลอยู่ใกล้ ๆ และวางเก้าอี้ไว้ด้านข้างเพื่อพยุงตัว",
    silhouette: "front",
    icon: ShieldAlert,
  },
  {
    id: "shoulder_flexion",
    label: "ยกแขนขึ้นเหนือหัว",
    shortLabel: "Shoulder Flexion",
    description: "ถ่ายวิดีโอเดียวเพื่อดูมุมไหล่และการชดเชยลำตัว",
    view: "front_and_side",
    distance: "ตั้งกล้องห่างประมาณ 2 เมตร",
    durationSeconds: 12,
    tutorialTitle: "ยกแขนขึ้นเหนือหัวช้า ๆ",
    tutorialBody:
      "ยืนตัวตรง ยกแขนขึ้นเหนือหัวช้า ๆ และพยายามไม่เอนลำตัวช่วย",
    silhouette: "side-chair",
    icon: Activity,
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
