import { Activity, Armchair, Footprints, ShieldAlert, type LucideIcon } from "lucide-react";
import type { PatientMovementType, PatientViewType } from "@/features/patient/types/patient.types";

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
  { id: "tight", label: "ตึง/แข็ง" },
  { id: "weak", label: "อ่อนแรง" },
  { id: "numb", label: "ชา/ซ่า" },
];

const safetyOptions: SymptomOption[] = [
  { id: "none", label: "ไม่มีอาการ" },
  { id: "pain", label: "ปวด" },
  { id: "dizzy", label: "เวียนศีรษะ" },
  { id: "unsafe", label: "รู้สึกไม่ปลอดภัย" },
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
    description: "นั่งหันข้างเข้ากล้อง แล้วยกเข่าข้างหนึ่งขึ้นเข้าหาหน้าอกเท่าที่สบาย",
    view: "side",
    distance: "วางกล้องห่างประมาณ 1.5-2 เมตร ระดับสะโพก และอยู่ด้านข้างเก้าอี้",
    durationSeconds: 10,
    tutorialTitle: "ท่ายกเข่านั่งเพื่อประเมินการงอสะโพก",
    tutorialBody:
      "นั่งหลังตรงบนเก้าอี้ที่มั่นคง โดยวางเท้าทั้งสองข้างราบกับพื้น จากนั้นยกเข่าข้างหนึ่งขึ้นเข้าหาหน้าอกเท่าที่สบาย ระบบจะอ่านมุมระหว่างลำตัวกับต้นขาจากมุมด้านข้าง",
    safetyNote: "ให้นั่งอยู่ตลอดท่านี้ ห้ามลุกขึ้นยืนหรือเอนหลังแรง ๆ เพื่อฝืนท่า",
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
    description: "นอนคว่ำ เหยียดขาตรง แล้วค่อย ๆ ยกขาตรงข้างหนึ่งพ้นพื้น",
    view: "side",
    distance: "วางกล้องห่างประมาณ 1.5-2 เมตร ที่ระดับเตียงหรือเสื่อ และอยู่ด้านข้างลำตัว",
    durationSeconds: 10,
    tutorialTitle: "ท่ายกขาตรงนอนคว่ำเพื่อประเมินการเหยียดสะโพก",
    tutorialBody:
      "นอนคว่ำบนเตียงหรือเสื่อโดยเหยียดขาทั้งสองข้างตรง แล้วยกขาตรงข้างหนึ่งขึ้นอย่างนุ่มนวลโดยไม่งอเข่า หากนอนคว่ำลำบาก ให้ยืนหันหน้าเข้าหาโต๊ะหรือเคาน์เตอร์แล้วใช้มือทั้งสองข้างพยุง จากนั้นค่อย ๆ เหวี่ยงขาข้างหนึ่งไปด้านหลัง",
    safetyNote: "ควรใช้ท่านอนคว่ำเป็นหลัก หากต้องใช้ท่ายืน ให้จับโต๊ะหรือเคาน์เตอร์ที่มั่นคงด้วยมือทั้งสองข้าง และหยุดทันทีหากรู้สึกไม่ปลอดภัย",
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
    description: "นั่งที่ขอบเตียงหรือโต๊ะโดยให้ต้นขาได้รับการพยุง แล้วงอเข่าเพื่อนำส้นเท้าถอยกลับ",
    view: "side",
    distance: "วางกล้องห่างประมาณ 1.5-2 เมตร อยู่ด้านข้างขาที่ทดสอบ",
    durationSeconds: 10,
    tutorialTitle: "ท่างอเข่านั่งริมเตียง",
    tutorialBody:
      "นั่งที่ขอบเตียงหรือโต๊ะที่มั่นคง โดยให้ต้นขาได้รับการพยุงและปล่อยช่วงล่างของขาห้อยลง จากนั้นงอเข่าเพื่อนำส้นเท้าถอยกลับใต้ตัว โดยรักษาสมดุลและการพยุงไว้ตลอดเวลา",
    safetyNote: "ตรวจสอบว่าเตียงหรือโต๊ะมั่นคงก่อนเริ่ม และใช้มือพยุงได้หากจำเป็น",
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
    description: "จากท่านั่งริมเตียงเดิม ให้เหยียดช่วงล่างของขาออกไปจนเกือบขนานพื้น",
    view: "side",
    distance: "วางกล้องห่างประมาณ 1.5-2 เมตร อยู่ด้านข้างขาที่ทดสอบ",
    durationSeconds: 10,
    tutorialTitle: "ท่าเหยียดเข่านั่งริมเตียง",
    tutorialBody:
      "นั่งที่ขอบเตียงหรือโต๊ะที่มั่นคงโดยให้ต้นขาได้รับการพยุง ค่อย ๆ เหยียดช่วงล่างของขาออกไปจนเกือบขนานพื้น แล้วผ่อนกลับ ระบบจะอ่านมุมระหว่างต้นขากับหน้าแข้งขณะเข่าเหยียดตรง",
    safetyNote: "ห้ามเหวี่ยงขาเร็วเกินไป ให้เคลื่อนไหวช้า ๆ และหยุดหากอาการปวดเข่าเพิ่มขึ้น",
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
    description: "นั่งโดยวางเท้าราบกับพื้น คงส้นเท้าไว้กับพื้น แล้วกระดกปลายเท้าขึ้นเข้าหาแข้ง",
    view: "side",
    distance: "วางกล้องห่างประมาณ 1-1.5 เมตร อยู่ด้านข้างของเท้าและข้อเท้าที่ทดสอบ",
    durationSeconds: 8,
    tutorialTitle: "ท่ายกปลายเท้านั่งโดยส้นเท้าแตะพื้น",
    tutorialBody:
      "นั่งบนเก้าอี้โดยวางเท้าราบกับพื้น คงส้นเท้าไว้กับพื้นแล้วกระดกปลายเท้าและฝ่าเท้าส่วนหน้าขึ้นเข้าหาแข้ง ท่านี้ใช้แทนท่ายืนพุ่งเข่าเข้ากำแพงเพื่อประเมินมุมหน้าแข้งกับเท้าอย่างปลอดภัยกว่า",
    safetyNote: "คงส้นเท้าไว้บนพื้นและนั่งอยู่ตลอดท่า ไม่จำเป็นต้องทำท่ายืนพุ่ง",
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
    description: "นั่งโดยยกเท้าขึ้นจากพื้นเล็กน้อย แล้วเหยียดปลายเท้าลงให้มากที่สุดเท่าที่สบาย",
    view: "side",
    distance: "วางกล้องห่างประมาณ 1-1.5 เมตร อยู่ด้านข้างของเท้าและข้อเท้าที่ทดสอบ",
    durationSeconds: 8,
    tutorialTitle: "ท่าเหยียดปลายเท้านั่งโดยไม่ยกส้น",
    tutorialBody:
      "นั่งบนเก้าอี้แล้วยกเท้าที่ทดสอบพ้นพื้นขึ้นเล็กน้อย เหยียดปลายเท้าลงเท่าที่สบายโดยให้หน้าแข้งยังมองเห็นได้ชัด ระบบจะอ่านมุมระหว่างหน้าแข้งกับเท้า",
    safetyNote: "ห้ามทำท่ายืนเขย่งส้น ท่านี้ควรนั่งทำเพื่อหลีกเลี่ยงความเสี่ยงต่อการล้ม",
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
