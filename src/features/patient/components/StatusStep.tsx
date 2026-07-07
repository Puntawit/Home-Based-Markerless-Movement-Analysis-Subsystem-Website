import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";

type StatusStepState = "done" | "failed" | "loading" | "pending";

type StatusStepProps = {
  title: string;
  description: string;
  state: StatusStepState;
};

const stateStyles: Record<StatusStepState, { row: string; icon: ReactNode }> = {
  done: {
    row: "border-emerald-200 bg-emerald-50",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  },
  loading: {
    row: "border-blue-200 bg-blue-50",
    icon: <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />,
  },
  failed: {
    row: "border-rose-200 bg-rose-50",
    icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
  },
  pending: {
    row: "border-amber-200 bg-amber-50",
    icon: <Clock3 className="h-5 w-5 text-amber-600" />,
  },
};

export function StatusStep({ title, description, state }: StatusStepProps) {
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", stateStyles[state].row)}>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
        {stateStyles[state].icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs leading-5 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
