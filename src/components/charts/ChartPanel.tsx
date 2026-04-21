import { CfdChart } from "./CfdChart";
import { LeadTimeChart } from "./LeadTimeChart";
import { ThroughputChart } from "./ThroughputChart";
import { AgingWipChart } from "./AgingWipChart";
import { FlowEfficiencyChart } from "./FlowEfficiencyChart";
import { LittlesLawDisplay } from "./LittlesLawDisplay";

export function ChartPanel() {
  return (
    <div className="chart-panel">
      <CfdChart />
      <LeadTimeChart />
      <ThroughputChart />
      <AgingWipChart />
      <FlowEfficiencyChart />
      <LittlesLawDisplay />
    </div>
  );
}
