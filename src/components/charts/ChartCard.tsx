import type { ReactNode } from "react";

export const STAGE_COLORS = [
  "#818cf8",
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#fb923c",
  "#f87171",
  "#e879f9",
];

export const BACKLOG_COLOR = "#a1a1aa";
export const DONE_COLOR = "#6ee7b7";

export const PERCENTILE_COLORS: Record<string, string> = {
  p50: "#34d399",
  p85: "#fbbf24",
  p95: "#f87171",
};

export const ACTIVE_COLOR = "#34d399";
export const WAIT_COLOR = "#f87171";

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--text-primary)",
};

interface ChartCardProps {
  title: string;
  hasData: boolean;
  children: ReactNode;
  fullWidth?: boolean;
}

export function ChartCard({ title, hasData, children, fullWidth }: ChartCardProps) {
  return (
    <div className={`chart-card panel${fullWidth ? " chart-card--full" : ""}`}>
      <h3 className="chart-card__title">{title}</h3>
      {hasData ? (
        children
      ) : (
        <div className="chart-card__empty">No data yet</div>
      )}
    </div>
  );
}
