import { Activity, CheckCircle2, Gauge, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { AnalysisSession } from "@/features/analysis/types/analysis.types";
import { formatNumber } from "@/lib/formatNumber";

type SummaryCardsProps = {
  sessions: AnalysisSession[];
};

export function SummaryCards({ sessions }: SummaryCardsProps) {
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const averageScore =
    completedSessions.reduce((total, session) => total + (session.score ?? 0), 0) /
    Math.max(1, completedSessions.length);
  const processingCount = sessions.filter((session) => session.status === "processing").length;

  const cards = [
    {
      label: "Total Sessions",
      value: sessions.length,
      icon: ListChecks,
      color: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Completed",
      value: completedSessions.length,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Average Score",
      value: formatNumber(averageScore, 0),
      icon: Gauge,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Processing",
      value: processingCount,
      icon: Activity,
      color: "bg-blue-50 text-blue-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{card.value}</p>
            </div>
            <div className={`rounded-md p-3 ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
