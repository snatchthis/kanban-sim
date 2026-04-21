import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProjection } from "@/hooks/useProjection";
import { useConfigStore } from "@/store/config-store";
import { agingWipProjection } from "@/projections";
import {
  CHART_TOOLTIP_STYLE,
  ChartCard,
  PERCENTILE_COLORS,
  STAGE_COLORS,
} from "./ChartCard";

function getStageColor(
  stageId: string | null,
  stages: ReadonlyArray<{ readonly id: string }>,
): string {
  if (!stageId) return "#a1a1aa";
  const idx = stages.findIndex((s) => s.id === stageId);
  return idx >= 0 ? STAGE_COLORS[idx % STAGE_COLORS.length]! : "#a1a1aa";
}

export function AgingWipChart() {
  const data = useProjection(agingWipProjection);
  const stages = useConfigStore((s) => s.board.stages);
  const hasData = data.items.length > 0;

  return (
    <ChartCard title="Aging WIP" hasData={hasData}>
      <ResponsiveContainer
        width="100%"
        height={Math.max(120, data.items.length * 28 + 40)}
      >
        <BarChart data={data.items} layout="vertical" margin={{ left: 60 }}>
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
          <Bar dataKey="age" radius={[0, 2, 2, 0]}>
            {data.items.map((item) => (
              <Cell
                key={item.itemId}
                fill={getStageColor(item.currentStage, stages)}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
          {data.percentileLines.p50 > 0 && (
            <ReferenceLine
              x={data.percentileLines.p50}
              stroke={PERCENTILE_COLORS["p50"]}
              strokeDasharray="4 4"
              label="p50"
            />
          )}
          {data.percentileLines.p85 > 0 && (
            <ReferenceLine
              x={data.percentileLines.p85}
              stroke={PERCENTILE_COLORS["p85"]}
              strokeDasharray="4 4"
              label="p85"
            />
          )}
          {data.percentileLines.p95 > 0 && (
            <ReferenceLine
              x={data.percentileLines.p95}
              stroke={PERCENTILE_COLORS["p95"]}
              strokeDasharray="4 4"
              label="p95"
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
