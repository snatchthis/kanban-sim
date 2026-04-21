import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

interface PerItemTiming {
  activeTime: number;
  lastWorkStart: number | null;
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
        lastWorkStart: null,
      };
      const byItem = {
        ...state.byItem,
        [event.itemId]: {
          activeTime: prior.activeTime,
          lastWorkStart: event.time,
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
          lastWorkStart: null,
        },
      };
      return { ...state, byItem };
    }

    if (event.type === "item_delivered") {
      const timing = state.byItem[event.itemId];
      if (!timing) return state;
      const lead = event.totalLeadTime;
      const active = timing.activeTime;
      const wait = Math.max(0, lead - active);
      const item: FlowEfficiencyItem = {
        itemId: event.itemId,
        activeTime: active,
        waitTime: wait,
        efficiency: lead > 0 ? active / lead : 0,
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
