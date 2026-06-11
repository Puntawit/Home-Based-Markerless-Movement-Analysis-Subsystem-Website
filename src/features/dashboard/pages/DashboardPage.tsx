import { ArrowRight, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScoreCard } from "@/features/analysis/components/ScoreCard";
import { movementTypeLabels } from "@/features/analysis/types/analysis.types";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { RecentSessions } from "@/features/dashboard/components/RecentSessions";
import { useAnalysisSessions } from "@/features/analysis/hooks/useAnalysis";
import { formatDate } from "@/lib/formatDate";

export function DashboardPage() {
  const { data: sessions = [], isLoading, isError } = useAnalysisSessions();
  const latestCompleted = sessions.find((session) => session.status === "completed");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of movement analysis activity and recent results."
        actions={
          <Link to="/analysis/new" className={buttonStyles()}>
            <UploadCloud className="h-4 w-4" />
            New Analysis
          </Link>
        }
      />

      {isLoading ? <LoadingSpinner label="Loading dashboard" /> : null}

      {isError ? (
        <EmptyState
          title="Dashboard data failed to load"
          description="The mock API returned an error. Refresh the page and try again."
        />
      ) : null}

      {!isLoading && !isError ? (
        sessions.length === 0 ? (
          <EmptyState
            title="No analysis sessions yet"
            description="Create the first session to start tracking movement analysis results."
            icon={<UploadCloud className="h-10 w-10" />}
            action={
              <Link to="/analysis/new" className={buttonStyles()}>
                <UploadCloud className="h-4 w-4" />
                Start Analysis
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            <SummaryCards sessions={sessions} />

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <RecentSessions sessions={sessions} />

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Latest Analysis Result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {latestCompleted ? (
                      <>
                        <ScoreCard score={latestCompleted.score} />
                        <div>
                          <p className="text-base font-semibold text-slate-950">
                            {latestCompleted.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {movementTypeLabels[latestCompleted.movementType]} -{" "}
                            {formatDate(latestCompleted.createdAt)}
                          </p>
                          <p className="mt-3 text-sm text-slate-600">
                            {latestCompleted.summary}
                          </p>
                        </div>
                        <Link
                          to={`/analysis/${latestCompleted.id}`}
                          className={buttonStyles({ variant: "outline" })}
                        >
                          <ArrowRight className="h-4 w-4" />
                          View Result
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">No completed result is available yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
