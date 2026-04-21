import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProjection } from "@/hooks/useProjection";
import { leadTimeProjection } from "@/projections";
import {
  CHART_TOOLTIP_STYLE,
  ChartCard,
  PERCENTILE_COLORS,
} from "./ChartCard";

export function LeadTimeChart() {
  const data = useProjection(leadTimeProjection);
  const hasData = data.items.length > 0;

  return (
    <ChartCard title="Lead Time" hasData={hasData}>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="completedAt"
            type="number"
            name="Completed at"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            dataKey="leadTime"
            type="number"
            name="Lead time"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Scatter data={data.items} fill="#818cf8" fillOpacity={0.7} />
          {hasData && (
            <>
              <ReferenceLine
                y={data.percentiles.p50}
                stroke={PERCENTILE_COLORS["p50"]}
                strokeDasharray="4 4"
                label="p50"
              />
              <ReferenceLine
                y={data.percentiles.p85}
                stroke={PERCENTILE_COLORS["p85"]}
                strokeDasharray="4 4"
                label="p85"
              />
              <ReferenceLine
                y={data.percentiles.p95}
                stroke={PERCENTILE_COLORS["p95"]}
                strokeDasharray="4 4"
                label="p95"
              />
            </>
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
