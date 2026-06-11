import { CalendarDays, CheckCircle2, Home, Stethoscope } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getLatestDoctorFeedback } from "@/features/patient/api/patientApi";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { formatThaiShortDate } from "@/lib/formatDate";

export function PatientFeedbackPage() {
  const navigate = useNavigate();
  const feedbackQuery = useQuery({
    queryKey: ["patient", "latest-feedback"],
    queryFn: getLatestDoctorFeedback,
  });

  const feedback = feedbackQuery.data;

  return (
    <MobileScreen
      backTo="/patient/home"
      subtitle="อ่านคำแนะนำจากแพทย์ และนำไปใช้ในการฝึกรอบถัดไป"
      title="Feedback จากแพทย์"
    >
      {feedbackQuery.isLoading || !feedback ? (
        <LoadingSpinner label="กำลังโหลด feedback" />
      ) : (
        <>
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

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">สรุปผลเบื้องต้น</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{feedback.summary}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">คำแนะนำ</h2>
            <div className="space-y-2">
              {feedback.recommendations.map((recommendation) => (
                <div
                  className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4"
                  key={recommendation}
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm leading-6 text-slate-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </section>

          <Button
            className="h-12 w-full bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-600"
            icon={<Home className="h-4 w-4" />}
            onClick={() => navigate("/patient/home")}
            size="lg"
          >
            กลับหน้าหลัก
          </Button>
        </>
      )}
    </MobileScreen>
  );
}
