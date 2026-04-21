import type { SimulationEvent, WorkItem } from "@/engine/types";
import type { Projection } from "./types";

export interface WorkItemView {
  id: string;
  blocked: boolean;
  classOfService: WorkItem extends { classOfService: infer C } ? C : never;
  createdAt: number;
}

export const itemCatalogProjection: Projection<Map<string, WorkItemView>> = {
  initial: new Map(),

  reduce(state: Map<string, WorkItemView>, event: SimulationEvent): Map<string, WorkItemView> {
    if (event.type === "item_arrived") {
      const next = new Map(state);
      next.set(event.itemId, {
        id: event.item.id,
        blocked: false,
        classOfService: event.item.classOfService,
        createdAt: event.item.createdAt,
      });
      return next;
    }

    if (event.type === "item_blocked") {
      const existing = state.get(event.itemId);
      if (!existing) return state;
      const next = new Map(state);
      next.set(event.itemId, { ...existing, blocked: true });
      return next;
    }

    if (event.type === "item_unblocked") {
      const existing = state.get(event.itemId);
      if (!existing) return state;
      const next = new Map(state);
      next.set(event.itemId, { ...existing, blocked: false });
      return next;
    }

    return state;
  },
};
