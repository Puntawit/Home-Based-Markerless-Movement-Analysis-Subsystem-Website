import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { AnalysisIssue, IssueSeverity } from "@/features/analysis/types/analysis.types";

type IssueListProps = {
  issues?: AnalysisIssue[];
};

const severityTone: Record<IssueSeverity, "yellow" | "red" | "slate"> = {
  low: "slate",
  medium: "yellow",
  high: "red",
};

export function IssueList({ issues = [] }: IssueListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detected Issues</CardTitle>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-slate-500">No issues detected.</p>
        ) : (
          <ul className="space-y-3">
            {issues.map((issue) => (
              <li key={issue.id} className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{issue.title}</p>
                    <Badge tone={severityTone[issue.severity]}>{issue.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{issue.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
