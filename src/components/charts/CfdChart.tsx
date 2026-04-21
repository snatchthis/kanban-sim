import { useMemo } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProjection } from "@/hooks/useProjection";
import { useConfigStore } from "@/store/config-store";
import { cfdProjection } from "@/projections";
import type { CfdData } from "@/projections";
import {
  BACKLOG_COLOR,
  DONE_COLOR,
  STAGE_COLORS,
  CHART_TOOLTIP_STYLE,
  ChartCard,
} from "./ChartCard";

interface FlatCfdPoint {
  time: number;
  backlog: number;
  done: number;
  [key: string]: number;
}

function flattenCfdData(data: CfdData): FlatCfdPoint[] {
  return data.dataPoints.map((dp) => ({
    time: dp.time,
    backlog: dp.backlog,
    done: dp.done,
    ...dp.stages,
  }));
}

export function CfdChart() {
  const cfdData = useProjection(cfdProjection);
  const stages = useConfigStore((s) => s.board.stages);
  const flatData = useMemo(() => flattenCfdData(cfdData), [cfdData]);

  return (
    <ChartCard title="Cumulative Flow Diagram" hasData={flatData.length > 0} fullWidth>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={flatData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="time"
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
          <Legend />
          <Area
            type="stepAfter"
            dataKey="backlog"
            stackId="1"
            stroke={BACKLOG_COLOR}
            fill={BACKLOG_COLOR}
            fillOpacity={0.3}
            name="Backlog"
          />
          {stages.map((stage, i) => (
            <Area
              key={stage.id}
              type="stepAfter"
              dataKey={stage.id}
              stackId="1"
              stroke={STAGE_COLORS[i % STAGE_COLORS.length]}
              fill={STAGE_COLORS[i % STAGE_COLORS.length]}
              fillOpacity={0.3}
              name={stage.name}
            />
          ))}
          <Area
            type="stepAfter"
            dataKey="done"
            stackId="1"
            stroke={DONE_COLOR}
            fill={DONE_COLOR}
            fillOpacity={0.3}
            name="Done"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
