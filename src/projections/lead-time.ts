import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface LeadTimeData {
  items: Array<{
    itemId: string;
    leadTime: number;
    completedAt: number;
    classOfService: string;
  }>;
  percentiles: {
    p50: number;
    p85: number;
    p95: number;
  };
}

export const leadTimeProjection: Projection<LeadTimeData> = {
  initial: {
    items: [],
    percentiles: { p50: 0, p85: 0, p95: 0 },
  },
  reduce: (state, event: SimulationEvent) => {
    if (event.type !== "item_delivered") return state;

    const items = [
      ...state.items,
      {
        itemId: event.itemId,
        leadTime: event.totalLeadTime,
        completedAt: event.time,
        classOfService: "standard",
      },
    ];

    const times = items.map((i) => i.leadTime).sort((a, b) => a - b);
    const percentile = (p: number) => {
      const idx = Math.ceil((p / 100) * times.length) - 1;
      return times[Math.max(0, idx)] ?? 0;
    };

    return {
      items,
      percentiles: {
        p50: percentile(50),
        p85: percentile(85),
        p95: percentile(95),
      },
    };
  },
};
