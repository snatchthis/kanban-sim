import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { useProjection } from "@/hooks/useProjection";
import { useConfigStore } from "@/store/config-store";
import { cfdProjection, leadTimeProjection } from "@/projections";
import type { CfdData } from "@/projections";

const STAGE_COLORS = ["#F59E0B", "#3B82F6", "#8B5CF6", "#06B6D4", "#EC4899"];
const BACKLOG_COLOR = "#475569";
const DONE_COLOR = "#22C55E";

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#0F1626",
  border: "1px solid rgba(110, 135, 195, 0.24)",
  borderRadius: 6,
  fontSize: 11,
  color: "#E6ECFA",
  fontFamily: "inherit",
};

interface FlatCfdPoint {
  time: number;
  backlog: number;
  done: number;
  [key: string]: number;
}

function flattenCfd(data: CfdData): FlatCfdPoint[] {
  return data.dataPoints.map((dp) => ({
    time: dp.time,
    backlog: dp.backlog,
    done: dp.done,
    ...dp.stages,
  }));
}

export function ChartsStrip() {
  return (
    <div className="charts-strip">
      <CfdCard />
      <LeadTimeCard />
    </div>
  );
}

function CfdCard() {
  const cfd = useProjection(cfdProjection);
  const stages = useConfigStore((s) => s.board.stages);
  const flat = useMemo(() => flattenCfd(cfd), [cfd]);
  const hasData = flat.length > 1;

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <span className="chart-card__dot" />
        <h3 className="chart-card__title">Cumulative Flow</h3>
      </div>
      <div className="chart-card__body">
        {!hasData ? (
          <div className="chart-card__empty">Awaiting data stream</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flat} margin={{ top: 6, right: 8, bottom: 6, left: 0 }}>
              <CartesianGrid
                stroke="rgba(110, 135, 195, 0.1)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                type="number"
                tick={{ fill: "#5B6784", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(110, 135, 195, 0.15)" }}
              />
              <YAxis
                tick={{ fill: "#5B6784", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="stepAfter"
                dataKey="done"
                stackId="1"
                stroke={DONE_COLOR}
                fill={DONE_COLOR}
                fillOpacity={0.35}
                name="Done"
              />
              {[...stages].reverse().map((stage, ri) => {
                const i = stages.length - 1 - ri;
                const color = STAGE_COLORS[i % STAGE_COLORS.length];
                return (
                  <Area
                    key={stage.id}
                    type="stepAfter"
                    dataKey={stage.id}
                    stackId="1"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.35}
                    name={stage.name}
                  />
                );
              })}
              <Area
                type="stepAfter"
                dataKey="backlog"
                stackId="1"
                stroke={BACKLOG_COLOR}
                fill={BACKLOG_COLOR}
                fillOpacity={0.3}
                name="Backlog"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function LeadTimeCard() {
  const data = useProjection(leadTimeProjection);
  const hasData = data.items.length > 0;

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <span className="chart-card__dot chart-card__dot--blue" />
        <h3 className="chart-card__title">Lead Time Trajectory</h3>
      </div>
      <div className="chart-card__body">
        {!hasData ? (
          <div className="chart-card__empty">Awaiting delivered items</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 6, right: 8, bottom: 6, left: 0 }}>
              <CartesianGrid
                stroke="rgba(110, 135, 195, 0.1)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="completedAt"
                type="number"
                tick={{ fill: "#5B6784", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(110, 135, 195, 0.15)" }}
              />
              <YAxis
                dataKey="leadTime"
                type="number"
                tick={{ fill: "#5B6784", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Scatter data={data.items} fill="#60A5FA" fillOpacity={0.8} />
              <ReferenceLine
                y={data.percentiles.p50}
                stroke="#22C55E"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                y={data.percentiles.p85}
                stroke="#F59E0B"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                y={data.percentiles.p95}
                stroke="#EF4444"
                strokeDasharray="3 3"
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
