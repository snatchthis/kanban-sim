import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProjection } from "@/hooks/useProjection";
import { flowEfficiencyProjection } from "@/projections";
import {
  ACTIVE_COLOR,
  CHART_TOOLTIP_STYLE,
  ChartCard,
  WAIT_COLOR,
} from "./ChartCard";

const MAX_ITEMS = 30;

export function FlowEfficiencyChart() {
  const data = useProjection(flowEfficiencyProjection);
  const visibleItems = data.items.slice(-MAX_ITEMS);
  const hasData = data.items.length > 0;

  return (
    <ChartCard title="Flow Efficiency" hasData={hasData}>
      <div className="chart-card__kpi">
        <span className="chart-card__kpi-label">Avg efficiency</span>
        <span className="chart-card__kpi-value">
          {(data.averageEfficiency * 100).toFixed(1)}%
        </span>
      </div>
      <ResponsiveContainer
        width="100%"
        height={Math.max(120, visibleItems.length * 24 + 40)}
      >
        <BarChart data={visibleItems} layout="vertical" margin={{ left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            dataKey="itemId"
            type="category"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            width={50}
          />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend />
          <Bar
            dataKey="activeTime"
            stackId="1"
            fill={ACTIVE_COLOR}
            name="Active"
          />
          <Bar
            dataKey="waitTime"
            stackId="1"
            fill={WAIT_COLOR}
            name="Wait"
            radius={[0, 2, 2, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
