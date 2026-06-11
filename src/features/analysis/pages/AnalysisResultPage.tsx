import { History, Printer } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AngleChart } from "@/features/analysis/components/AngleChart";
import { IssueList } from "@/features/analysis/components/IssueList";
import { MetricCard } from "@/features/analysis/components/MetricCard";
import { RecommendationList } from "@/features/analysis/components/RecommendationList";
import { ResultSummary } from "@/features/analysis/components/ResultSummary";
import { ScoreCard } from "@/features/analysis/components/ScoreCard";
import { SymmetryChart } from "@/features/analysis/components/SymmetryChart";
import { VideoPreview } from "@/features/analysis/components/VideoPreview";
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

export function AnalysisResultPage() {
  const { id } = useParams();
  const { data: session, isLoading, isError } = useAnalysisSession(id);

  if (isLoading) {
    return <LoadingSpinner label="Loading analysis result" />;
  }

  if (isError || !session) {
    return (
      <EmptyState
        title="Analysis result not found"
        description="This session may have been deleted or the link is incorrect."
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
        title={session.name}
        description={`${movementTypeLabels[session.movementType]} - ${formatDate(session.createdAt)}`}
        actions={
          <>
            <Link to="/analysis/history" className={buttonStyles({ variant: "outline" })}>
              <History className="h-4 w-4" />
              History
            </Link>
            <Link to={`/analysis/${session.id}/report`} className={buttonStyles()}>
              <Printer className="h-4 w-4" />
              Report
            </Link>
          </>
        }
      />

      <div className="mb-4">
        <Badge tone={statusTone[session.status]}>{analysisStatusLabels[session.status]}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <VideoPreview videoUrl={session.videoUrl} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(session.metrics ?? []).map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <ScoreCard score={session.score} />
          <ResultSummary summary={session.summary} note={session.note} />
          <IssueList issues={session.issues} />
          <RecommendationList recommendations={session.recommendations} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AngleChart data={session.chartData} />
        <SymmetryChart metrics={session.metrics} />
      </div>
    </div>
  );
}
