import { Activity, CheckCircle2, ChevronRight, LogOut, Send, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  getLatestDoctorFeedback,
  getLatestPatientSession,
  getPatientDraftSession,
  submitPatientSession,
} from "@/features/patient/api/patientApi";
import { getMovementTaskLabel, movementTaskMap } from "@/features/patient/data/movementTasks";
import { FeedbackCard } from "@/features/patient/components/FeedbackCard";
import { LatestSessionCard } from "@/features/patient/components/LatestSessionCard";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { clearBackendAuthToken } from "@/lib/backendApi";

export function PatientHomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSessionQuery = useQuery({
    queryKey: ["patient", "draft-session"],
    queryFn: getPatientDraftSession,
  });
  const sessionQuery = useQuery({
    queryKey: ["patient", "latest-session"],
    queryFn: getLatestPatientSession,
  });
  const feedbackQuery = useQuery({
    queryKey: ["patient", "latest-feedback"],
    queryFn: getLatestDoctorFeedback,
  });

  const submitMutation = useMutation({
    mutationFn: submitPatientSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient"] });
      navigate("/patient/status");
    },
  });

  const activeSession = activeSessionQuery.data ?? null;
  const latestSession = sessionQuery.data;
  const completedCount = activeSession?.tasks.filter((task) => task.status === "recorded").length ?? 0;
  const totalCount = activeSession?.tasks.length ?? 0;
  const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isReadyToSubmit = totalCount > 0 && completedCount === totalCount;
  const patientLabel = activeSession?.patientName ?? latestSession?.patientName ?? "ผู้ป่วย";

  function handleLogout() {
    clearBackendAuthToken();
    queryClient.removeQueries({ queryKey: ["patient"] });
    navigate("/auth/login?type=patient", {
      replace: true,
      state: { message: "ออกจากระบบเรียบร้อยแล้ว" },
    });
  }

  return (
    <MobileScreen>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm">สวัสดีครับ</p>
              <h1 className="truncate text-base font-semibold text-slate-950 sm:text-xl">{patientLabel}</h1>
            </div>
          </div>
          <Button
            aria-label="ออกจากระบบ"
            className="h-10 w-10 shrink-0 rounded-full sm:h-9 sm:w-9"
            icon={<LogOut className="h-4 w-4" />}
            onClick={handleLogout}
            size="icon"
            title="ออกจากระบบ"
            variant="outline"
          >
            <span className="sr-only">ออกจากระบบ</span>
          </Button>
        </div>

        <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3">
          <p className="text-sm font-semibold text-cyan-950">สถานะ Session ปัจจุบัน</p>
          <p className="mt-1 text-xs leading-5 text-cyan-800">
            {activeSession
              ? `Complete all ${totalCount} assigned movements in this session before sending them to your doctor.`
              : "ยังไม่มี session ที่แพทย์มอบหมาย เมื่อแพทย์สร้าง session แล้วรายการท่าจะปรากฏที่นี่"}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ProgressBar label={`${completedCount}/${totalCount} ท่าเสร็จแล้ว`} valueLabel="" value={progressValue} />
          <Button
            className="mt-4 h-12 w-full bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600"
            data-testid="patient-submit-session"
            disabled={!isReadyToSubmit || submitMutation.isPending}
            icon={<Send className="h-4 w-4" />}
            onClick={() => submitMutation.mutate()}
            size="lg"
            variant="secondary"
          >
            {submitMutation.isPending ? "กำลังส่ง session..." : "ส่ง Session ให้แพทย์"}
          </Button>
          {submitMutation.isError ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitMutation.error instanceof Error
                ? submitMutation.error.message
                : "ไม่สามารถส่ง session นี้ได้ กรุณาลองอีกครั้ง"}
            </p>
          ) : null}
        </div>

        {activeSessionQuery.isError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            โหลด active session ไม่ได้ กรุณาตรวจสอบว่า MongoDB และ backend ทำงานอยู่
          </p>
        ) : activeSessionQuery.isLoading ? (
          <LoadingSpinner label="กำลังโหลด active session" />
        ) : !activeSession ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">ยังไม่มี session ที่แพทย์มอบหมาย</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              ตอนนี้ยังไม่มีรายการท่าที่ต้องบันทึก กรุณารอให้แพทย์สร้าง session ให้ก่อน
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {activeSession.tasks.map((sessionTask) => {
              const task = movementTaskMap[sessionTask.movementType];
              const TaskIcon = task?.icon ?? Activity;
              const recorded = sessionTask.status === "recorded";
              const sessionTaskId = sessionTask.sessionTaskId ?? sessionTask.id;

              return (
                <button
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/50"
                  data-testid={`patient-task-${sessionTask.movementType}`}
                  key={sessionTaskId}
                  onClick={() =>
                    navigate(`/patient/tutorial?task=${sessionTask.movementType}&sessionTaskId=${sessionTaskId}`)
                  }
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-cyan-100 group-hover:text-cyan-700">
                      <TaskIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {task?.label ?? getMovementTaskLabel(sessionTask.movementType)}
                        </p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {task?.description ?? "Task from the assigned protocol"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={recorded ? "green" : "slate"}>{recorded ? "บันทึกแล้ว" : "ยังไม่เริ่ม"}</Badge>
                        {task ? <Badge tone="cyan">{task.durationSeconds} วินาที</Badge> : null}
                        {sessionTask.quality ? (
                          <Badge tone={sessionTask.quality.qualityScore >= 90 ? "green" : "yellow"}>
                            คุณภาพ {sessionTask.quality.qualityScore}
                          </Badge>
                        ) : null}
                        {sessionTask.fileName ? (
                          <Badge className="max-w-full truncate" tone="blue">
                            {sessionTask.fileName}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {recorded ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Session ล่าสุดที่ส่งแล้ว</h2>
        {sessionQuery.isError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            โหลด session ล่าสุดไม่สำเร็จ
          </p>
        ) : sessionQuery.isLoading ? (
          <LoadingSpinner label="กำลังโหลด session" />
        ) : sessionQuery.data ? (
          <LatestSessionCard session={sessionQuery.data} />
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            ยังไม่มี session ที่ส่งให้แพทย์
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Feedback จากแพทย์</h2>
        {feedbackQuery.isError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            โหลด feedback ล่าสุดไม่สำเร็จ
          </p>
        ) : feedbackQuery.isLoading ? (
          <LoadingSpinner label="กำลังโหลด feedback" />
        ) : feedbackQuery.data ? (
          <FeedbackCard feedback={feedbackQuery.data} />
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            ยังไม่มี feedback ล่าสุด
          </p>
        )}
      </section>
    </MobileScreen>
  );
}
