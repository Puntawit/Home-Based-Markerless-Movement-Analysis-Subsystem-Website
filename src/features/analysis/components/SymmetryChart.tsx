import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { MovementMetric } from "@/features/analysis/types/analysis.types";

type SymmetryChartProps = {
  metrics?: MovementMetric[];
};

export function SymmetryChart({ metrics = [] }: SymmetryChartProps) {
  const leftKnee = metrics.find((metric) => metric.id === "left-knee-angle")?.value ?? 0;
  const rightKnee = metrics.find((metric) => metric.id === "right-knee-angle")?.value ?? 0;
  const symmetry = metrics.find((metric) => metric.id === "left-right-symmetry")?.value ?? 0;

  const data = [
    { name: "Left Knee", value: leftKnee },
    { name: "Right Knee", value: rightKnee },
    { name: "Symmetry", value: symmetry },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Left-Right Symmetry</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0e7490" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
