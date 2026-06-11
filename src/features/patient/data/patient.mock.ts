import { movementTasks } from "@/features/patient/data/movementTasks";
import type {
  DoctorFeedback,
  PatientSession,
  PatientSessionTask,
} from "@/features/patient/types/patient.types";

export const demoPatient = {
  id: "PATIENT-7712",
  displayName: "Patient-7712",
};

export const latestDoctorFeedbackMock: DoctorFeedback = {
  id: "fb-1001",
  doctorName: "นพ. ธนกฤต",
  createdAt: "2026-06-08T10:30:00+07:00",
  summary:
    "ผลคัดกรองเบื้องต้นพบความเสี่ยงระดับปานกลางจากการทรงตัวและความสมมาตรของการเดิน ควรฝึกใกล้เก้าอี้หรือมีผู้ดูแลอยู่ข้าง ๆ",
  recommendations: [
    "ฝึกยืนขาเดียวครั้งละ 10 วินาที โดยจับพนักเก้าอี้ไว้ก่อน",
    "ทำท่าลุก-นั่งช้า ๆ และควบคุมเข่าให้อยู่ในแนวตรง",
    "ส่งวิดีโอรอบถัดไปโดยให้เห็นลำตัวและเท้าทั้งสองข้างชัดเจน",
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
  quality: {
    orientation: "passed",
    lighting: "passed",
    distanceConfirmed: true,
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
