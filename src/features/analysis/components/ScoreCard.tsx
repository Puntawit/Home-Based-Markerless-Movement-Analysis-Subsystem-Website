import { Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

type ScoreCardProps = {
  score?: number;
};

function getScoreColor(score: number) {
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-amber-700";
  return "text-rose-700";
}

export function ScoreCard({ score }: ScoreCardProps) {
  const displayScore = score ?? 0;

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
          <Gauge className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Overall Score</p>
          <p className={`text-3xl font-semibold ${getScoreColor(displayScore)}`}>
            {score === undefined ? "--" : displayScore}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
