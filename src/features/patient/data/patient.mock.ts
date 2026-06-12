import { movementTasks } from "@/features/patient/data/movementTasks";
import type {
  DoctorFeedback,
  PatientQualityGate,
  PatientSession,
  PatientSessionTask,
} from "@/features/patient/types/patient.types";

export const demoPatient = {
  id: "PATIENT-7712",
  displayName: "Patient-7712",
};

export const defaultQualityGate: PatientQualityGate = {
  calibrationMethod: "a4_reference",
  calibrationVisible: true,
  bodyFraming: "passed",
  lighting: "passed",
  cameraAngle: "passed",
  occlusion: "passed",
  distanceConfirmed: true,
  qualityScore: 92,
  issues: [],
};

export const latestDoctorFeedbackMock: DoctorFeedback = {
  id: "fb-1001",
  doctorName: "นพ. ธนกฤต",
  createdAt: "2026-06-08T10:30:00+07:00",
  summary:
    "ผลรวมของ session นี้อยู่ในระดับปานกลาง จุดที่ควรติดตามคือการทรงตัวขาเดียวและการควบคุมเข่าระหว่างลุก-นั่ง",
  patientSummary:
    "โดยรวมทำได้ดี แต่ยังมีช่วงที่สะโพกเอียงและลำตัวช่วยพยุงตัวเล็กน้อย ให้ฝึกตามแผนด้านล่างและถ่ายวิดีโอใหม่เฉพาะท่ายืนขาเดียว",
  clinicalSummary:
    "พบ pelvic drop ระหว่าง single-leg stance, knee valgus tendency ระหว่าง sit-to-stand และ trunk compensation เล็กน้อยระหว่าง shoulder flexion. Video quality ใช้งานได้ แต่ single-leg stance มี occlusion ช่วงปลายคลิป",
  taskNotes: [
    {
      movementType: "gait_walk",
      severity: "low",
      title: "Gait pattern stable",
      clinicalNote: "Cadence 94 spm, symmetry index 91%, ไม่พบ gait abnormality เด่น",
      patientAction: "เดินด้วยจังหวะปกติ และพยายามให้เท้าทั้งสองข้างอยู่ในกรอบกล้องตลอด",
    },
    {
      movementType: "sit_to_stand",
      severity: "moderate",
      title: "Knee control needs monitoring",
      clinicalNote: "มี knee valgus tendency และ concentric phase ช้ากว่าที่คาด",
      patientAction: "ฝึกลุก-นั่งช้า ๆ โดยให้เข่าชี้ไปทางเดียวกับปลายเท้า",
    },
    {
      movementType: "single_leg_stance",
      severity: "moderate",
      title: "Pelvic drop and balance drift",
      clinicalNote: "พบ pelvic drop และ center-of-mass drift ช่วงกลางคลิป",
      patientAction: "ฝึกยืนขาเดียวใกล้เก้าอี้ ครั้งละ 10 วินาที และให้มีคนอยู่ใกล้ ๆ",
    },
    {
      movementType: "shoulder_flexion",
      severity: "low",
      title: "Mild trunk compensation",
      clinicalNote: "ROM 151 องศา มี trunk compensation เล็กน้อยช่วงท้ายการยกแขน",
      patientAction: "ยกแขนช้า ๆ โดยเกร็งลำตัวให้นิ่ง ไม่แอ่นหลังช่วย",
    },
  ],
  exercisePlan: [
    {
      id: "ex-balance-chair",
      title: "Supported single-leg balance",
      frequency: "ทุกวัน",
      sets: "2 รอบ",
      reps: "ข้างละ 10 วินาที",
      safetyNote: "จับพนักเก้าอี้ไว้หลวม ๆ และหยุดทันทีถ้ามึนหัวหรือเสียการทรงตัว",
    },
    {
      id: "ex-sit-control",
      title: "Slow sit-to-stand control",
      frequency: "วันเว้นวัน",
      sets: "2 รอบ",
      reps: "รอบละ 5 ครั้ง",
      safetyNote: "ใช้เก้าอี้มั่นคง วางเท้าเต็มพื้น และไม่รีบลุก",
    },
  ],
  retakeRequests: [
    {
      movementType: "single_leg_stance",
      reason: "ช่วงท้ายคลิปเท้าด้านซ้ายถูกบัง ทำให้ประเมิน balance drift ได้ไม่ครบ",
      priority: "moderate",
    },
  ],
  followUpPlan: {
    nextCheckIn: "ส่ง assessment ใหม่อีกครั้งใน 7 วัน",
    watchFor: ["ปวดเข่าเพิ่มขึ้น", "เวียนหัวระหว่างยืนขาเดียว", "ล้ม หรือเกือบล้ม"],
    escalationNote: "หากมีอาการปวดมากหรือเสียการทรงตัวบ่อย ให้ติดต่อคลินิกก่อนถึงรอบถัดไป",
  },
  recommendations: [
    "ฝึกยืนขาเดียวใกล้เก้าอี้ วันละ 2 รอบ",
    "ทำท่าลุก-นั่งช้า ๆ และคุมเข่าให้อยู่ในแนวตรง",
    "ถ่ายวิดีโอท่ายืนขาเดียวใหม่โดยให้เห็นลำตัวและเท้าทั้งสองข้างชัดเจน",
  ],
};

export function createEmptySessionTasks(): PatientSessionTask[] {
  return movementTasks.map((task) => ({
    id: `draft-${task.id}`,
    movementType: task.id,
    status: "not_started",
    view: task.view,
  }));
}

export const completedTaskMocks: PatientSessionTask[] = movementTasks.map((task, index) => ({
  id: `task-1001-${task.id}`,
  movementType: task.id,
  status: "recorded",
  view: task.view,
  videoUrl: undefined,
  fileName: `${task.id}-demo.webm`,
  note: index === 2 ? "รู้สึกเสียการทรงตัวเล็กน้อยตอนยกขาซ้าย" : undefined,
  symptomReport: {
    items: task.symptomQuestions.map((question) => ({
      bodyPartId: question.bodyPartId,
      bodyPartLabel: question.bodyPartLabel,
      symptomId: index === 2 && question.bodyPartId === "balance" ? "unstable" : "none",
      symptomLabel: index === 2 && question.bodyPartId === "balance" ? "ไม่มั่นคง" : "ไม่มีอาการ",
    })),
    additionalNote: index === 2 ? "รู้สึกเสียการทรงตัวเล็กน้อยตอนยกขาซ้าย" : undefined,
  },
  quality: {
    ...defaultQualityGate,
    qualityScore: index === 2 ? 78 : 92,
    occlusion: index === 2 ? "warning" : "passed",
    issues: index === 2 ? ["เท้าซ้ายถูกบังช่วงท้ายคลิป"] : [],
  },
  updatedAt: "2026-06-08T09:00:00+07:00",
}));

export const patientSessionsMock: PatientSession[] = [
  {
    id: "pat-sess-1001",
    patientName: demoPatient.displayName,
    patientId: demoPatient.id,
    status: "feedback_ready",
    createdAt: "2026-06-08T09:00:00+07:00",
    submittedAt: "2026-06-08T09:12:00+07:00",
    tasks: completedTaskMocks,
    feedback: latestDoctorFeedbackMock,
  },
];
