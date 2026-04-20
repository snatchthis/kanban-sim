import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface LittlesLawData {
  averageWip: number;
  averageThroughput: number;
  averageLeadTime: number;
  predictedLeadTime: number;
  isValid: boolean;
}

export const littlesLawProjection: Projection<LittlesLawData> = {
  initial: {
    averageWip: 0,
    averageThroughput: 0,
    averageLeadTime: 0,
    predictedLeadTime: 0,
    isValid: false,
  },
  reduce: (state, _event: SimulationEvent) => {
    return state;
  },
};
