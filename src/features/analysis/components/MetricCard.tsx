import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { MovementMetric } from "@/features/analysis/types/analysis.types";

type MetricCardProps = {
  metric: MovementMetric;
};

const statusConfig = {
  good: { icon: CheckCircle2, color: "text-emerald-700", background: "bg-emerald-50" },
  warning: { icon: AlertTriangle, color: "text-amber-700", background: "bg-amber-50" },
  bad: { icon: XCircle, color: "text-rose-700", background: "bg-rose-50" },
};

export function MetricCard({ metric }: MetricCardProps) {
  const config = statusConfig[metric.status];
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{metric.name}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {metric.value}
            <span className="ml-1 text-sm font-medium text-slate-500">{metric.unit}</span>
          </p>
        </div>
        <div className={`rounded-md p-2 ${config.background} ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
