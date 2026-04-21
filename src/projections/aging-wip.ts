import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface AgingWipItem {
  itemId: string;
  currentStage: string | null;
  enteredWipAt: number;
  age: number;
}

export interface AgingWipData {
  items: AgingWipItem[];
  deliveredLeadTimes: number[];
  percentileLines: {
    p50: number;
    p85: number;
    p95: number;
  };
  currentTime: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? 0;
}

function recomputeAges(items: AgingWipItem[], now: number): AgingWipItem[] {
  return items.map((i) => ({ ...i, age: now - i.enteredWipAt }));
}

export const agingWipProjection: Projection<AgingWipData> = {
  initial: {
    items: [],
    deliveredLeadTimes: [],
    percentileLines: { p50: 0, p85: 0, p95: 0 },
    currentTime: 0,
  },
  reduce: (state, event: SimulationEvent) => {
    const currentTime = event.time;

    if (event.type === "item_pulled") {
      const existing = state.items.find((i) => i.itemId === event.itemId);
      const items = existing
        ? state.items.map((i) =>
            i.itemId === event.itemId ? { ...i, currentStage: event.stageId } : i
          )
        : [
            ...state.items,
            {
              itemId: event.itemId,
              currentStage: event.stageId,
              enteredWipAt: event.time,
              age: 0,
            },
          ];
      return {
        ...state,
        items: recomputeAges(items, currentTime),
        currentTime,
      };
    }

    if (event.type === "item_delivered") {
      const finished = state.items.find((i) => i.itemId === event.itemId);
      const deliveredLeadTimes = finished
        ? [...state.deliveredLeadTimes, event.time - finished.enteredWipAt]
        : state.deliveredLeadTimes;
      const sorted = [...deliveredLeadTimes].sort((a, b) => a - b);
      return {
        items: recomputeAges(
          state.items.filter((i) => i.itemId !== event.itemId),
          currentTime
        ),
        deliveredLeadTimes,
        percentileLines: {
          p50: percentile(sorted, 50),
          p85: percentile(sorted, 85),
          p95: percentile(sorted, 95),
        },
        currentTime,
      };
    }

    return { ...state, items: recomputeAges(state.items, currentTime), currentTime };
  },
};
