import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { MovementChartData } from "@/features/analysis/types/analysis.types";

type AngleChartProps = {
  data?: MovementChartData[];
};

export function AngleChart({ data = [] }: AngleChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Angle Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} unit="s" />
              <YAxis tick={{ fontSize: 12 }} unit="deg" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="leftKnee" name="Left Knee" stroke="#0891b2" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rightKnee" name="Right Knee" stroke="#059669" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hip" name="Hip" stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="shoulder" name="Shoulder" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
