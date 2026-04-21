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

function periodOf(t: number) {
  return Math.floor(t / PERIOD_LENGTH);
}

function extendBucketsTo(
  buckets: ThroughputData["buckets"],
  periodIndex: number,
): ThroughputData["buckets"] {
  if (buckets.length > periodIndex) return buckets;
  const next = buckets.slice();
  for (let i = buckets.length; i <= periodIndex; i++) {
    next.push({
      periodStart: i * PERIOD_LENGTH,
      periodEnd: (i + 1) * PERIOD_LENGTH,
      count: 0,
    });
  }
  return next;
}

export const throughputProjection: Projection<ThroughputData> = {
  initial: {
    buckets: [],
    totalDelivered: 0,
    averagePerPeriod: 0,
    periodLength: PERIOD_LENGTH,
  },
  reduce: (state, event: SimulationEvent) => {
    const idx = periodOf(event.time);
    let buckets = extendBucketsTo(state.buckets, idx);
    let totalDelivered = state.totalDelivered;

    if (event.type === "item_delivered") {
      const b = buckets[idx]!;
      buckets = buckets.slice();
      buckets[idx] = { ...b, count: b.count + 1 };
      totalDelivered += 1;
    }

    return {
      ...state,
      buckets,
      totalDelivered,
      averagePerPeriod:
        buckets.length > 0 ? totalDelivered / buckets.length : 0,
      periodLength: PERIOD_LENGTH,
    };
  },
};
