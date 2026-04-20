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
}

const PERIOD_LENGTH = 1;

export const throughputProjection: Projection<ThroughputData> = {
  initial: {
    buckets: [],
    totalDelivered: 0,
    averagePerPeriod: 0,
  },
  reduce: (state, event: SimulationEvent) => {
    if (event.type !== "item_delivered") return state;

    const periodIndex = Math.floor(event.time / PERIOD_LENGTH);
    const periodStart = periodIndex * PERIOD_LENGTH;
    const periodEnd = periodStart + PERIOD_LENGTH;

    const buckets = [...state.buckets];
    const existingBucket = buckets.find((b) => b.periodStart === periodStart);

    if (existingBucket) {
      const idx = buckets.indexOf(existingBucket);
      buckets[idx] = { ...existingBucket, count: existingBucket.count + 1 };
    } else {
      buckets.push({ periodStart, periodEnd, count: 1 });
    }

    const totalDelivered = state.totalDelivered + 1;
    const numPeriods = buckets.length || 1;

    return {
      buckets,
      totalDelivered,
      averagePerPeriod: totalDelivered / numPeriods,
    };
  },
};
