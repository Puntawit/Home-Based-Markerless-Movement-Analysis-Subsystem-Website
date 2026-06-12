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
import { movementTaskMap } from "@/features/patient/data/movementTasks";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { StatusStep } from "@/features/patient/components/StatusStep";

export function PatientStatusPage() {
  const navigate = useNavigate();
  const sessionQuery = useQuery({
    queryKey: ["patient", "latest-session"],
    queryFn: getLatestPatientSession,
  });

  const statusQuery = useQuery({
    enabled: Boolean(sessionQuery.data?.id),
    queryKey: ["patient", "status", sessionQuery.data?.id],
    queryFn: () => getPatientSessionStatus(sessionQuery.data!.id),
  });

  const session = sessionQuery.data;
  const status = statusQuery.data ?? session?.status ?? "waiting_doctor";
  const mediaPipeState = status === "waiting_doctor" ? "loading" : "done";
  const randomForestState = status === "waiting_doctor" ? "loading" : "done";
  const reviewState = status === "feedback_ready" ? "done" : "pending";

  return (
    <MobileScreen
      backTo="/patient/home"
      subtitle={session ? `${session.patientId} | 4 movement videos` : "กำลังโหลด session ล่าสุด"}
      title="สถานะการประมวลผล"
    >
      {sessionQuery.isLoading || !session ? (
        <LoadingSpinner label="กำลังโหลดสถานะ" />
      ) : (
        <>
          <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-950">วิดีโอใน session นี้</p>
            {session.tasks.map((task) => {
              const movementTask = movementTaskMap[task.movementType];
              const qualityScore = task.quality?.qualityScore;
              return (
                <div className="flex items-center justify-between gap-3 text-sm" key={task.movementType}>
                  <span className="flex min-w-0 items-center gap-2 text-slate-700">
                    <Video className="h-4 w-4 shrink-0 text-cyan-700" />
                    <span className="truncate">{movementTask.label}</span>
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

          <div className="space-y-3">
            <StatusStep
              description="ระบบได้รับวิดีโอครบ 4 ท่าใน assessment session เดียวแล้ว"
              state="done"
              title="ส่ง Session สำเร็จ"
            />
            <StatusStep
              description={
                mediaPipeState === "loading"
                  ? "ระบบกำลังสกัด keypoints และ skeleton จากวิดีโอทั้ง 4 ท่าด้วย MediaPipe"
                  : "MediaPipe สกัดพิกัด skeleton ครบทั้ง 4 ท่าแล้ว"
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
                  ? "แพทย์ส่ง structured feedback สำหรับ session นี้แล้ว"
                  : "แพทย์จะตรวจผลรวมของ 4 ท่าและส่ง feedback กลับมา"
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
        </>
      )}
    </MobileScreen>
  );
}
