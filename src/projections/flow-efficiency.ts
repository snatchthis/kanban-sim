import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface FlowEfficiencyData {
  items: Array<{
    itemId: string;
    activeTime: number;
    waitTime: number;
    efficiency: number;
  }>;
  averageEfficiency: number;
}

export const flowEfficiencyProjection: Projection<FlowEfficiencyData> = {
  initial: {
    items: [],
    averageEfficiency: 0,
  },
  reduce: (state, event: SimulationEvent) => {
    if (event.type !== "item_delivered") return state;

    const newItem = {
      itemId: event.itemId,
      activeTime: 0,
      waitTime: event.totalLeadTime,
      efficiency: 0,
    };

    const items = [...state.items, newItem];
    const totalEfficiency = items.reduce((sum, i) => sum + i.efficiency, 0);

    return {
      items,
      averageEfficiency: items.length > 0 ? totalEfficiency / items.length : 0,
    };
  },
};
