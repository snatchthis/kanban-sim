import { useProjection } from "@/hooks/useProjection";
import { littlesLawProjection } from "@/projections";
import { ChartCard } from "./ChartCard";

export function LittlesLawDisplay() {
  const data = useProjection(littlesLawProjection);
  const hasData = data.totalDelivered > 0;

  return (
    <ChartCard title="Little's Law Validation" hasData={hasData} fullWidth>
      <div className="kpi-grid">
        <KpiCard label="Avg WIP" value={data.averageWip.toFixed(2)} />
        <KpiCard
          label="Avg Throughput"
          value={data.averageThroughput.toFixed(3)}
        />
        <KpiCard
          label="Avg Lead Time"
          value={data.averageLeadTime.toFixed(2)}
        />
        <KpiCard
          label="Predicted Lead Time"
          value={data.predictedLeadTime.toFixed(2)}
        />
        <KpiCard
          label="Valid"
          value={data.isValid ? "Yes" : "No"}
          variant={data.isValid ? "success" : "danger"}
        />
        <KpiCard label="Delivered" value={String(data.totalDelivered)} />
      </div>
    </ChartCard>
  );
}

function KpiCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "success" | "danger";
}) {
  return (
    <div className={`kpi-card${variant ? ` kpi-card--${variant}` : ""}`}>
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">{value}</span>
    </div>
  );
}
