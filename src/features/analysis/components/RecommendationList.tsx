import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type RecommendationListProps = {
  recommendations?: string[];
};

export function RecommendationList({ recommendations = [] }: RecommendationListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">No recommendations available.</p>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((recommendation) => (
              <li key={recommendation} className="flex gap-3 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
