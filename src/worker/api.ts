import type { SimulationConfig, SimulationResult } from "@/engine/types";
import { runSimulation } from "@/engine/simulation";

export interface SimulationApi {
  run(config: SimulationConfig): SimulationResult;
  runBatch(configs: SimulationConfig[]): SimulationResult[];
}

const api: SimulationApi = {
  run: (config) => runSimulation(config),
  runBatch: (configs) => configs.map((config) => runSimulation(config)),
};

export default api;
