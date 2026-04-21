import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProjection } from "@/hooks/useProjection";
import { throughputProjection } from "@/projections";
import { CHART_TOOLTIP_STYLE, ChartCard } from "./ChartCard";

export function ThroughputChart() {
  const data = useProjection(throughputProjection);
  const hasData = data.buckets.length > 0;

  return (
    <ChartCard title="Throughput" hasData={hasData}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.buckets}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="periodStart"
            type="number"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="count" fill="#818cf8" radius={[2, 2, 0, 0]} />
          {hasData && (
            <ReferenceLine
              y={data.averagePerPeriod}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label="avg"
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
