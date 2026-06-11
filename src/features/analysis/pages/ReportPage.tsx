import { ArrowLeft, Printer } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AngleChart } from "@/features/analysis/components/AngleChart";
import { MetricCard } from "@/features/analysis/components/MetricCard";
import { SymmetryChart } from "@/features/analysis/components/SymmetryChart";
import { useAnalysisSession } from "@/features/analysis/hooks/useAnalysis";
import {
  analysisStatusLabels,
  movementTypeLabels,
  type AnalysisStatus,
} from "@/features/analysis/types/analysis.types";
import { formatDate } from "@/lib/formatDate";

const statusTone: Record<AnalysisStatus, "slate" | "blue" | "green" | "red"> = {
  pending: "slate",
  processing: "blue",
  completed: "green",
  failed: "red",
};

export function ReportPage() {
  const { id } = useParams();
  const { data: session, isLoading, isError } = useAnalysisSession(id);

  if (isLoading) {
    return <LoadingSpinner label="Loading report" />;
  }

  if (isError || !session) {
    return (
      <EmptyState
        title="Report not found"
        description="This analysis session may have been deleted."
        action={
          <Link to="/analysis/history" className={buttonStyles({ variant: "outline" })}>
            Back to History
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Analysis Report"
        description={session.name}
        actions={
          <>
            <Link to={`/analysis/${session.id}`} className={buttonStyles({ variant: "outline" })}>
              <ArrowLeft className="h-4 w-4" />
              Back to Result
            </Link>
            <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />

      <div className="print-surface space-y-6 rounded-lg bg-white p-5 shadow-sm">
        <div className="border-b border-slate-200 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase text-slate-500">
                Internship_project_Movement_Analysis
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{session.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {movementTypeLabels[session.movementType]} - {formatDate(session.createdAt)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <Badge tone={statusTone[session.status]}>{analysisStatusLabels[session.status]}</Badge>
              <p className="mt-3 text-sm text-slate-500">Overall Score</p>
              <p className="text-4xl font-semibold text-cyan-800">{session.score ?? "--"}</p>
            </div>
          </div>
        </div>

        <Card className="print-surface">
          <CardHeader>
            <CardTitle>Session Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{session.summary ?? "No summary available."}</p>
            {session.note ? (
              <p className="mt-3 text-sm text-slate-500">
                <span className="font-medium text-slate-700">Note:</span> {session.note}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(session.metrics ?? []).slice(0, 6).map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="print-surface">
            <CardHeader>
              <CardTitle>Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {(session.issues ?? []).length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-600">
                  {(session.issues ?? []).map((issue) => (
                    <li key={issue.id}>
                      <span className="font-medium text-slate-950">{issue.title}:</span>{" "}
                      {issue.description}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No issues detected.</p>
              )}
            </CardContent>
          </Card>

          <Card className="print-surface">
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {(session.recommendations ?? []).length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-600">
                  {(session.recommendations ?? []).map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No recommendations available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AngleChart data={session.chartData} />
          <SymmetryChart metrics={session.metrics} />
        </div>
      </div>
    </div>
  );
}
