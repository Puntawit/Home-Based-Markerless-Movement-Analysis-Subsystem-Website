import { CheckCircle2, CircleDot, Loader2, UploadCloud, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { ProcessingState } from "@/features/analysis/types/analysis.types";

type AnalysisStatusProps = {
  state: ProcessingState;
};

const statusConfig: Record<ProcessingState, { label: string; description: string; icon: typeof CircleDot }> = {
  idle: {
    label: "Idle",
    description: "Ready to upload a movement video.",
    icon: CircleDot,
  },
  uploading: {
    label: "Uploading",
    description: "Sending video to the mock analysis service.",
    icon: UploadCloud,
  },
  uploaded: {
    label: "Uploaded",
    description: "Video upload finished.",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    description: "Mock pose and movement metrics are being generated.",
    icon: Loader2,
  },
  success: {
    label: "Success",
    description: "Analysis is complete.",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    description: "Something went wrong. Please try again.",
    icon: XCircle,
  },
};

export function AnalysisStatus({ state }: AnalysisStatusProps) {
  const config = statusConfig[state];
  const Icon = config.icon;
  const tone = state === "error" ? "red" : state === "success" || state === "uploaded" ? "green" : "cyan";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mt-0.5 rounded-md bg-slate-100 p-2 text-slate-700">
        <Icon className={state === "processing" ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
      </div>
      <div>
        <Badge tone={tone}>{config.label}</Badge>
        <p className="mt-2 text-sm text-slate-600">{config.description}</p>
      </div>
    </div>
  );
}
