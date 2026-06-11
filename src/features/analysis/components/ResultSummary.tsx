import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type ResultSummaryProps = {
  summary?: string;
  note?: string;
};

export function ResultSummary({ summary, note }: ResultSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <p>{summary ?? "No summary is available yet."}</p>
        {note ? (
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-medium text-slate-700">Session note</p>
            <p className="mt-1">{note}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
