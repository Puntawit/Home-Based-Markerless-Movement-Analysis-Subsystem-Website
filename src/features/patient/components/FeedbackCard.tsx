import { ChevronRight, MessageCircle, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { DoctorFeedback } from "@/features/patient/types/patient.types";
import { formatThaiShortDate } from "@/lib/formatDate";

type FeedbackCardProps = {
  feedback: DoctorFeedback;
};

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const navigate = useNavigate();
  const hasRetake = feedback.retakeRequests.length > 0;

  return (
    <button className="block w-full text-left" onClick={() => navigate("/patient/feedback")} type="button">
      <Card className="border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100/70">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-950">{feedback.doctorName}</p>
                <p className="mt-1 text-xs text-amber-700">{formatThaiShortDate(feedback.createdAt)}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-700" />
            </div>
            <p className="line-clamp-2 text-sm leading-6 text-slate-700">{feedback.patientSummary}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{feedback.exercisePlan.length} ท่าออกกำลังกาย</Badge>
              {hasRetake ? (
                <Badge tone="yellow" className="gap-1">
                  <RotateCcw className="h-3 w-3" />
                  ต้องถ่ายใหม่
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
}
