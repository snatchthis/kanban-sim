import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface ThroughputData {
  buckets: Array<{
    periodStart: number;
    periodEnd: number;
    count: number;
  }>;
  totalDelivered: number;
  averagePerPeriod: number;
  periodLength: number;
}

const PERIOD_LENGTH = 1;

export const throughputProjection: Projection<ThroughputData> = {
  initial: {
    buckets: [],
    totalDelivered: 0,
    averagePerPeriod: 0,
    periodLength: PERIOD_LENGTH,
  },
  reduce: (state, event: SimulationEvent) => {
    if (event.type !== "item_delivered") return state;

    const periodIndex = Math.floor(event.time / PERIOD_LENGTH);
    const periodStart = periodIndex * PERIOD_LENGTH;
    const periodEnd = periodStart + PERIOD_LENGTH;

    const buckets = [...state.buckets];
    const existingIdx = buckets.findIndex((b) => b.periodStart === periodStart);
    if (existingIdx >= 0) {
      const existing = buckets[existingIdx]!;
      buckets[existingIdx] = { ...existing, count: existing.count + 1 };
    } else {
      buckets.push({ periodStart, periodEnd, count: 1 });
    }

    const totalDelivered = state.totalDelivered + 1;
    const numPeriods = Math.max(1, periodIndex + 1);

    return {
      buckets,
      totalDelivered,
      averagePerPeriod: totalDelivered / numPeriods,
      periodLength: PERIOD_LENGTH,
    };
  },
};
