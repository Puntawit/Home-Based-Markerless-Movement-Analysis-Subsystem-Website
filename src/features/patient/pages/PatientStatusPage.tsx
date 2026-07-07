import { Home, MessageCircle, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  getLatestPatientSession,
  getPatientSessionStatus,
} from "@/features/patient/api/patientApi";
import { getMovementTaskLabel } from "@/features/patient/data/movementTasks";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { StatusStep } from "@/features/patient/components/StatusStep";
import type { PatientSessionStatus } from "@/features/patient/types/patient.types";

function shouldPollStatus(status?: PatientSessionStatus) {
  return status === "queued_analysis" || status === "processing_analysis" || status === "pending_doctor_review";
}

export function PatientStatusPage() {
  const navigate = useNavigate();
  const sessionQuery = useQuery({
    queryKey: ["patient", "latest-session"],
    queryFn: getLatestPatientSession,
    refetchInterval: (query) => (shouldPollStatus(query.state.data?.status) ? 5000 : false),
  });

  const statusQuery = useQuery({
    enabled: Boolean(sessionQuery.data?.id),
    queryKey: ["patient", "status", sessionQuery.data?.id],
    queryFn: () => getPatientSessionStatus(sessionQuery.data!.id),
    refetchInterval: (query) => (shouldPollStatus(query.state.data) ? 5000 : false),
  });

  // --- Loading state ---
  if (sessionQuery.isLoading) {
    return (
      <MobileScreen backTo="/patient/home" title="สถานะการประมวลผล">
        <LoadingSpinner label="กำลังโหลดสถานะ" />
      </MobileScreen>
    );
  }

  // --- Backend error state ---
  if (sessionQuery.isError) {
    return (
      <MobileScreen backTo="/patient/home" title="สถานะการประมวลผล">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">เกิดข้อผิดพลาด</p>
          <p className="mt-1 text-xs leading-5 text-rose-800">
            ไม่สามารถโหลดข้อมูล session ได้ กรุณาตรวจสอบว่า backend กำลังทำงานอยู่
          </p>
        </div>
        <Button
          className="h-12 w-full"
          icon={<Home className="h-4 w-4" />}
          onClick={() => navigate("/patient/home")}
          size="lg"
          variant="outline"
        >
          กลับหน้าหลัก
        </Button>
      </MobileScreen>
    );
  }

  // --- No submitted session yet ---
  if (!sessionQuery.data) {
    return (
      <MobileScreen backTo="/patient/home" title="สถานะการประมวลผล">
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Video className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">ยังไม่มี session ที่ส่งแล้ว</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              กรุณาบันทึกวิดีโอครบทุกท่าและส่ง session ให้แพทย์ก่อน
            </p>
          </div>
          <Button
            className="h-12 w-full bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-600"
            icon={<Home className="h-4 w-4" />}
            onClick={() => navigate("/patient/home")}
            size="lg"
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </MobileScreen>
    );
  }

  // --- Valid session loaded ---
  const session = sessionQuery.data;
  const status = statusQuery.data ?? session.status ?? "waiting_doctor";
  const taskCount = session.tasks.length ?? 0;
  const hasFailedAnalysis = status === "analysis_failed";
  const mediaPipeState =
    hasFailedAnalysis ? "failed" : status === "queued_analysis" || status === "processing_analysis" ? "loading" : "done";
  const randomForestState =
    hasFailedAnalysis ? "pending" : status === "queued_analysis" || status === "processing_analysis" ? "loading" : "done";
  const reviewState = status === "feedback_ready" ? "done" : "pending";

  return (
    <MobileScreen
      backTo="/patient/home"
      subtitle={`${session.patientId} | ${taskCount} วิดีโอ`}
      title="สถานะการประมวลผล"
    >
      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-950">วิดีโอใน session นี้</p>
        {session.tasks.map((task) => {
          const qualityScore = task.quality?.qualityScore;
          return (
            <div className="flex items-center justify-between gap-3 text-sm" key={task.movementType}>
              <span className="flex min-w-0 items-center gap-2 text-slate-700">
                <Video className="h-4 w-4 shrink-0 text-cyan-700" />
                <span className="truncate">{getMovementTaskLabel(task.movementType)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {qualityScore ? (
                  <Badge tone={qualityScore >= 90 ? "green" : "yellow"}>Q {qualityScore}</Badge>
                ) : null}
                <Badge tone="green">บันทึกแล้ว</Badge>
              </span>
            </div>
          );
        })}
      </section>

      {hasFailedAnalysis ? (
        <section className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">การวิเคราะห์ล้มเหลว</p>
          <p className="text-xs leading-5 text-rose-800">
            ระบบไม่สามารถวิเคราะห์ด้วย MediaPipe ได้ แพทย์สามารถลองใหม่ได้จาก dashboard
          </p>
          {session.tasks
            .filter((task) => task.analysisStatus === "failed" || task.analysisError)
            .map((task) => (
              <p className="text-xs text-rose-800" key={task.id}>
                {getMovementTaskLabel(task.movementType)}: {task.analysisError ?? "การวิเคราะห์ล้มเหลว"}
              </p>
            ))}
        </section>
      ) : null}

      <div className="space-y-3">
        <StatusStep
          description={`ระบบได้รับวิดีโอครบ ${taskCount} ท่าใน assessment session เดียวแล้ว`}
          state="done"
          title="ส่ง Session สำเร็จ"
        />
        <StatusStep
          description={
            mediaPipeState === "loading"
              ? `ระบบกำลังสกัด keypoints และ skeleton จากวิดีโอทั้ง ${taskCount} ท่าด้วย MediaPipe`
              : `MediaPipe สกัดพิกัด skeleton ครบทั้ง ${taskCount} ท่าแล้ว`
          }
          state={mediaPipeState}
          title="MediaPipe Pose Extraction"
        />
        <StatusStep
          description={
            randomForestState === "loading"
              ? "โมเดลกำลังจำแนก risk และ abnormality flags จาก clinical features ของทั้ง session"
              : "โมเดลสร้างผลคัดกรองเบื้องต้นครบแล้ว"
          }
          state={randomForestState}
          title="Random Forest Screening"
        />
        <StatusStep
          description={
            reviewState === "done"
              ? "แพทย์ส่ง feedback สำหรับ session นี้แล้ว"
              : `แพทย์จะตรวจผลรวมของ ${taskCount} ท่าและส่ง feedback กลับมา`
          }
          state={reviewState}
          title="รอแพทย์ตรวจสอบ"
        />
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
        <p className="text-sm font-semibold text-cyan-950">สถานะล่าสุด</p>
        <p className="mt-1 text-sm leading-6 text-cyan-800">
          ผลวิเคราะห์ของ session นี้ถูกส่งเข้า dashboard ของแพทย์แล้ว คุณสามารถกลับมาตรวจ feedback ได้หลังแพทย์ review เสร็จ
        </p>
      </div>

      <div className="space-y-3">
        <Button
          className="h-12 w-full bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-600"
          icon={<MessageCircle className="h-4 w-4" />}
          onClick={() => navigate("/patient/feedback")}
          size="lg"
        >
          ดู Feedback
        </Button>
        <Button
          className="h-11 w-full"
          icon={<Home className="h-4 w-4" />}
          onClick={() => navigate("/patient/home")}
          size="lg"
          variant="outline"
        >
          กลับหน้าหลัก
        </Button>
      </div>
    </MobileScreen>
  );
}
