import type { SimulationConfig, SimulationResult } from "@/engine/types";
import { runSimulation } from "@/engine/simulation";

export interface MonteCarloResult {
  runs: number;
  leadTimePercentiles: {
    p50: number;
    p85: number;
    p95: number;
    p99: number;
  };
  throughputPerRun: number[];
}

export function runMonteCarlo(
  baseConfig: SimulationConfig,
  runs: number
): MonteCarloResult {
  const results: SimulationResult[] = [];

  for (let i = 0; i < runs; i++) {
    const config = { ...baseConfig, seed: baseConfig.seed + i };
    results.push(runSimulation(config));
  }

  return {
    runs,
    leadTimePercentiles: { p50: 0, p85: 0, p95: 0, p99: 0 },
    throughputPerRun: results.map(() => 0),
  };
}
