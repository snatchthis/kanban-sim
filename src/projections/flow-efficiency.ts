import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

interface PerItemTiming {
  activeTime: number;
  waitTime: number;
  lastWorkStart: number | null;
  lastWorkEnd: number | null;
}

export interface FlowEfficiencyItem {
  itemId: string;
  activeTime: number;
  waitTime: number;
  efficiency: number;
}

export interface FlowEfficiencyData {
  items: FlowEfficiencyItem[];
  averageEfficiency: number;
  byItem: Record<string, PerItemTiming>;
}

function efficiencyOf(active: number, wait: number): number {
  const total = active + wait;
  return total > 0 ? active / total : 0;
}

export const flowEfficiencyProjection: Projection<FlowEfficiencyData> = {
  initial: {
    items: [],
    averageEfficiency: 0,
    byItem: {},
  },
  reduce: (state, event: SimulationEvent) => {
    if (event.type === "work_started") {
      const prior = state.byItem[event.itemId] ?? {
        activeTime: 0,
        waitTime: 0,
        lastWorkStart: null,
        lastWorkEnd: null,
      };
      const waitDelta =
        prior.lastWorkEnd !== null ? event.time - prior.lastWorkEnd : 0;
      const byItem = {
        ...state.byItem,
        [event.itemId]: {
          activeTime: prior.activeTime,
          waitTime: prior.waitTime + waitDelta,
          lastWorkStart: event.time,
          lastWorkEnd: null,
        },
      };
      return { ...state, byItem };
    }

    if (event.type === "work_completed") {
      const prior = state.byItem[event.itemId];
      if (!prior || prior.lastWorkStart === null) return state;
      const byItem = {
        ...state.byItem,
        [event.itemId]: {
          activeTime: prior.activeTime + (event.time - prior.lastWorkStart),
          waitTime: prior.waitTime,
          lastWorkStart: null,
          lastWorkEnd: event.time,
        },
      };
      return { ...state, byItem };
    }

    if (event.type === "item_delivered") {
      const timing = state.byItem[event.itemId];
      if (!timing) return state;
      const item: FlowEfficiencyItem = {
        itemId: event.itemId,
        activeTime: timing.activeTime,
        waitTime: timing.waitTime,
        efficiency: efficiencyOf(timing.activeTime, timing.waitTime),
      };
      const items = [...state.items, item];
      const total = items.reduce((sum, i) => sum + i.efficiency, 0);
      const { [event.itemId]: _removed, ...restByItem } = state.byItem;
      void _removed;
      return {
        items,
        averageEfficiency: items.length > 0 ? total / items.length : 0,
        byItem: restByItem,
      };
    }

    return state;
  },
};
