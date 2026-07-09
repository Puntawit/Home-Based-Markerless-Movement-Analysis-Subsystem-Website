import { CalendarDays, ChevronRight, Files, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { PatientSession } from "@/features/patient/types/patient.types";
import { formatThaiShortDate } from "@/lib/formatDate";

type LatestSessionCardProps = {
  session: PatientSession;
};

const statusLabels: Record<
  PatientSession["status"],
  { text: string; tone: "blue" | "green" | "yellow" | "slate" | "red" }
> = {
  assigned: { text: "รอบันทึก", tone: "blue" },
  draft: { text: "ฉบับร่าง", tone: "slate" },
  ready_to_submit: { text: "พร้อมส่ง", tone: "green" },
  waiting_doctor: { text: "รอแพทย์ตรวจ", tone: "yellow" },
  queued_analysis: { text: "กำลังรอวิเคราะห์", tone: "blue" },
  processing_analysis: { text: "กำลังประมวลผล", tone: "blue" },
  pending_doctor_review: { text: "รอแพทย์ตรวจ", tone: "yellow" },
  feedback_ready: { text: "มี feedback", tone: "green" },
  analysis_failed: { text: "วิเคราะห์ไม่สำเร็จ", tone: "red" },
};

export function LatestSessionCard({ session }: LatestSessionCardProps) {
  const navigate = useNavigate();
  const status = statusLabels[session.status];
  const recordedCount = session.tasks.filter((task) => task.status === "recorded").length;
  const totalCount = session.tasks.length;
  const qualityScores = session.tasks
    .map((task) => task.quality?.qualityScore)
    .filter((score): score is number => typeof score === "number");
  const averageQuality =
    qualityScores.length > 0
      ? Math.round(qualityScores.reduce((total, score) => total + score, 0) / qualityScores.length)
      : undefined;

  return (
    <button className="block w-full text-left" onClick={() => navigate("/patient/status")} type="button">
      <Card className="p-4 transition hover:border-cyan-200 hover:bg-cyan-50/40">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Files className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">เซสชันประเมิน</p>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatThaiShortDate(session.submittedAt ?? session.createdAt)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Video className="h-3.5 w-3.5 shrink-0" />
              {recordedCount}/{totalCount} วิดีโอ
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone={status.tone}>{status.text}</Badge>
              {averageQuality ? (
                <Badge tone={averageQuality >= 90 ? "green" : "yellow"}>คุณภาพ {averageQuality}</Badge>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
}
