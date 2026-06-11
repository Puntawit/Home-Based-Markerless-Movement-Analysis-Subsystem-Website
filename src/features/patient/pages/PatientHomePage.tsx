import { CheckCircle2, ChevronRight, Send, UserRound } from "lucide-react";
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
import { demoPatient } from "@/features/patient/data/patient.mock";
import { movementTaskMap } from "@/features/patient/data/movementTasks";
import { FeedbackCard } from "@/features/patient/components/FeedbackCard";
import { LatestSessionCard } from "@/features/patient/components/LatestSessionCard";
import { MobileScreen } from "@/features/patient/components/MobileScreen";

export function PatientHomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draftQuery = useQuery({
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

  const draft = draftQuery.data;
  const completedCount = draft?.tasks.filter((task) => task.status === "recorded").length ?? 0;
  const totalCount = draft?.tasks.length ?? 4;
  const isReadyToSubmit = completedCount === totalCount;

  return (
    <MobileScreen>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
            <UserRound className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">สวัสดีครับ</p>
            <h1 className="truncate text-xl font-semibold text-slate-950">
              Patient ID: {demoPatient.id}
            </h1>
          </div>
        </div>

        <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3">
          <p className="text-sm font-semibold text-cyan-950">Assessment Session ปัจจุบัน</p>
          <p className="mt-1 text-xs leading-5 text-cyan-800">
            บันทึกให้ครบทั้ง 4 ท่าใน session เดียวก่อน แล้วค่อยส่งให้แพทย์ตรวจ
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ProgressBar
            label={`${completedCount}/${totalCount} ท่าเสร็จแล้ว`}
            value={(completedCount / totalCount) * 100}
          />
          <Button
            className="mt-4 h-12 w-full bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600"
            disabled={!isReadyToSubmit || submitMutation.isPending}
            icon={<Send className="h-4 w-4" />}
            onClick={() => submitMutation.mutate()}
            size="lg"
            variant="secondary"
          >
            {submitMutation.isPending ? "กำลังส่ง session..." : "ส่ง Session ให้แพทย์"}
          </Button>
        </div>

        {draftQuery.isLoading ? (
          <LoadingSpinner label="กำลังโหลด session draft" />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {draft?.tasks.map((sessionTask) => {
              const task = movementTaskMap[sessionTask.movementType];
              const TaskIcon = task.icon;
              const recorded = sessionTask.status === "recorded";

              return (
                <button
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/50"
                  key={sessionTask.movementType}
                  onClick={() => navigate(`/patient/tutorial?task=${sessionTask.movementType}`)}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-cyan-100 group-hover:text-cyan-700">
                      <TaskIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">{task.label}</p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{task.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={recorded ? "green" : "slate"}>
                          {recorded ? "บันทึกแล้ว" : "ยังไม่เริ่ม"}
                        </Badge>
                        <Badge tone="cyan">{task.durationSeconds} วินาที</Badge>
                        {sessionTask.fileName ? (
                          <Badge tone="blue">{sessionTask.fileName}</Badge>
                        ) : null}
                      </div>
                    </div>
                    {recorded ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Session ล่าสุดที่ส่งแล้ว</h2>
        {sessionQuery.isLoading ? (
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
        {feedbackQuery.isLoading ? (
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
