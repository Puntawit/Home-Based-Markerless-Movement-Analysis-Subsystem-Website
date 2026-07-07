import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Home,
  MessageSquareText,
  RotateCcw,
  Stethoscope,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getLatestDoctorFeedback } from "@/features/patient/api/patientApi";
import { getMovementTaskLabel } from "@/features/patient/data/movementTasks";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import type { DoctorFeedbackSeverity } from "@/features/patient/types/patient.types";
import { formatThaiShortDate } from "@/lib/formatDate";

const severityTone: Record<DoctorFeedbackSeverity, "green" | "yellow" | "red"> = {
  low: "green",
  moderate: "yellow",
  high: "red",
};

export function PatientFeedbackPage() {
  const navigate = useNavigate();
  const feedbackQuery = useQuery({
    queryKey: ["patient", "latest-feedback"],
    queryFn: getLatestDoctorFeedback,
  });

  const feedback = feedbackQuery.data;

  // --- Loading state ---
  if (feedbackQuery.isLoading) {
    return (
      <MobileScreen backTo="/patient" title="Feedback จากแพทย์">
        <LoadingSpinner label="กำลังโหลด feedback" />
      </MobileScreen>
    );
  }

  // --- Backend error state ---
  if (feedbackQuery.isError) {
    return (
      <MobileScreen backTo="/patient" title="Feedback จากแพทย์">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">เกิดข้อผิดพลาด</p>
          <p className="mt-1 text-xs leading-5 text-rose-800">
            ไม่สามารถโหลด feedback ได้ กรุณาตรวจสอบว่า backend กำลังทำงานอยู่
          </p>
        </div>
        <Button
          className="h-12 w-full"
          icon={<Home className="h-4 w-4" />}
          onClick={() => navigate("/patient")}
          size="lg"
          variant="outline"
        >
          กลับหน้าหลัก
        </Button>
      </MobileScreen>
    );
  }

  // --- No feedback yet ---
  if (!feedback) {
    return (
      <MobileScreen
        backTo="/patient"
        subtitle="แผนดูแลตัวเองหลังแพทย์ตรวจ movement session"
        title="Feedback จากแพทย์"
      >
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50">
            <Stethoscope className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">แพทย์ยังไม่ได้ส่ง feedback</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              ระบบจะแจ้งเมื่อแพทย์ตรวจสอบวิดีโอของคุณและส่ง feedback แล้ว
            </p>
          </div>
          <Button
            className="h-12 w-full"
            icon={<Home className="h-4 w-4" />}
            onClick={() => navigate("/patient")}
            size="lg"
            variant="outline"
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      backTo="/patient"
      subtitle="แผนดูแลตัวเองหลังแพทย์ตรวจ movement session"
      title="Feedback จากแพทย์"
    >
      <div className="space-y-6 pb-8" data-testid="patient-feedback-page">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950">{feedback.doctorName}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatThaiShortDate(feedback.createdAt)}
            </p>
          </div>
        </div>

        <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-cyan-700" />
            <p className="text-sm font-semibold text-cyan-950">สรุปสำหรับคนไข้</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{feedback.patientSummary}</p>
        </section>

        {feedback.retakeRequests.length > 0 ? (
          <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-700" />
              <p className="text-sm font-semibold text-amber-950">ต้องถ่ายใหม่</p>
            </div>
            {feedback.retakeRequests.map((request) => (
              <div className="rounded-md bg-white/70 p-3" key={request.movementType}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-950">
                    {getMovementTaskLabel(request.movementType)}
                  </p>
                  <Badge tone={severityTone[request.priority]}>{request.priority}</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-700">{request.reason}</p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">ข้อสังเกตแยกตามท่า</h2>
          {feedback.taskNotes.map((note) => (
            <div
              className="rounded-lg border border-slate-200 bg-white p-4"
              key={note.movementType}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {getMovementTaskLabel(note.movementType)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{note.title}</p>
                </div>
                <Badge tone={severityTone[note.severity]}>{note.severity}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{note.patientAction}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Exercise Plan</h2>
          {feedback.exercisePlan.map((exercise) => (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4" key={exercise.id}>
              <div className="flex items-start gap-3">
                <Dumbbell className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-emerald-950">{exercise.title}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-white/70 p-2">
                      <p className="font-semibold text-slate-900">{exercise.frequency}</p>
                      <p className="mt-1 text-slate-500">ความถี่</p>
                    </div>
                    <div className="rounded-md bg-white/70 p-2">
                      <p className="font-semibold text-slate-900">{exercise.sets}</p>
                      <p className="mt-1 text-slate-500">จำนวนรอบ</p>
                    </div>
                    <div className="rounded-md bg-white/70 p-2">
                      <p className="font-semibold text-slate-900">{exercise.reps}</p>
                      <p className="mt-1 text-slate-500">ต่อรอบ</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-emerald-900">{exercise.safetyNote}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">Follow-up Plan</p>
          <div className="flex gap-3 rounded-md bg-slate-50 p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm leading-6 text-slate-700">{feedback.followUpPlan.nextCheckIn}</p>
          </div>
          <div className="flex gap-3 rounded-md bg-rose-50 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-semibold text-rose-900">อาการที่ควรระวัง</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                {feedback.followUpPlan.watchFor.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {feedback.followUpPlan.escalationNote}
              </p>
            </div>
          </div>
        </section>

        <Button
          className="h-12 w-full bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-600"
          icon={<Home className="h-4 w-4" />}
          onClick={() => navigate("/patient")}
          size="lg"
        >
          กลับหน้าหลัก
        </Button>
      </div>
    </MobileScreen>
  );
}
