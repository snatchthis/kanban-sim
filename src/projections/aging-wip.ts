import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface AgingWipData {
  items: Array<{
    itemId: string;
    currentStage: string | null;
    age: number;
  }>;
  percentileLines: {
    p50: number;
    p85: number;
    p95: number;
  };
}

export const agingWipProjection: Projection<AgingWipData> = {
  initial: {
    items: [],
    percentileLines: { p50: 0, p85: 0, p95: 0 },
  },
  reduce: (state, event: SimulationEvent) => {
    if (event.type === "item_delivered") {
      return {
        ...state,
        items: state.items.filter((i) => i.itemId !== event.itemId),
      };
    }

    if (event.type === "item_pulled") {
      return {
        ...state,
        items: [
          ...state.items.filter((i) => i.itemId !== event.itemId),
          {
            itemId: event.itemId,
            currentStage: event.stageId,
            age: 0,
          },
        ],
      };
    }

    return state;
  },
};
