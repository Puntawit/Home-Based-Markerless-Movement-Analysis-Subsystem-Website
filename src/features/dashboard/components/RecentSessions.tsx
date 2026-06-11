import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  analysisStatusLabels,
  movementTypeLabels,
  type AnalysisSession,
  type AnalysisStatus,
} from "@/features/analysis/types/analysis.types";
import { formatShortDate } from "@/lib/formatDate";

type RecentSessionsProps = {
  sessions: AnalysisSession[];
};

const statusTone: Record<AnalysisStatus, "slate" | "blue" | "green" | "red"> = {
  pending: "slate",
  processing: "blue",
  completed: "green",
  failed: "red",
};

export function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Recent Sessions</CardTitle>
        <Link to="/analysis/history" className="text-sm font-medium text-cyan-700 hover:text-cyan-900">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-slate-100">
          {sessions.slice(0, 5).map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-950">{session.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {movementTypeLabels[session.movementType]} - {formatShortDate(session.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={statusTone[session.status]}>{analysisStatusLabels[session.status]}</Badge>
                <span className="w-12 text-right text-sm font-semibold text-slate-800">
                  {session.score ?? "--"}
                </span>
                <Link
                  to={`/analysis/${session.id}`}
                  className={buttonStyles({ variant: "outline", size: "sm" })}
                >
                  <ArrowRight className="h-4 w-4" />
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
