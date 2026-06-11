import { ChevronRight, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import type { DoctorFeedback } from "@/features/patient/types/patient.types";
import { formatThaiShortDate } from "@/lib/formatDate";

type FeedbackCardProps = {
  feedback: DoctorFeedback;
};

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const navigate = useNavigate();

  return (
    <button className="block w-full text-left" onClick={() => navigate("/patient/feedback")} type="button">
      <Card className="border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100/70">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">{feedback.doctorName}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-700" />
            </div>
            <p className="text-xs text-amber-700">{formatThaiShortDate(feedback.createdAt)}</p>
            <p className="line-clamp-2 text-sm leading-6 text-slate-700">{feedback.summary}</p>
          </div>
        </div>
      </Card>
    </button>
  );
}
