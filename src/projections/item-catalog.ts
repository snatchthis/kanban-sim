import type { SimulationEvent, WorkItem, DistributionConfig } from "@/engine/types";
import { DistributionType } from "@/engine/types";
import type { Projection } from "./types";

export interface WorkItemView {
  id: string;
  blocked: boolean;
  classOfService: WorkItem["classOfService"];
  type: WorkItem["type"];
  title: string;
  createdAt: number;
  currentStageId: string | null;
  workStartedAt: number | null;
}

export interface ItemCatalogState {
  items: Map<string, WorkItemView>;
  stageMeans: Record<string, number>;
}

const TITLE_A = [
  "Subsystem",
  "API",
  "Auth",
  "Database",
  "Cache",
  "Queue",
  "Payload",
  "Module",
  "Session",
  "Signal",
  "Runtime",
  "Index",
  "Worker",
  "Vector",
  "Channel",
  "Render",
  "Telemetry",
  "Scheduler",
  "Gateway",
  "Router",
];

const TITLE_B = [
  "override",
  "migration",
  "refactor",
  "audit",
  "patch",
  "rollout",
  "sync",
  "hotfix",
  "retry",
  "handler",
  "probe",
  "metric",
  "pipeline",
  "reconnect",
  "normaliser",
  "bootstrap",
];

export function workItemTitle(id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
    hash >>>= 0;
  }
  const a = TITLE_A[hash % TITLE_A.length] ?? "Task";
  const b = TITLE_B[(hash >>> 8) % TITLE_B.length] ?? "update";
  return `${a} ${b}`;
}

function distributionMean(d: DistributionConfig): number {
  switch (d.type) {
    case DistributionType.Exponential: {
      const rate = d.params["rate"] ?? 1;
      return rate > 0 ? 1 / rate : 1;
    }
    case DistributionType.Normal:
      return d.params["mean"] ?? 1;
    case DistributionType.LogNormal: {
      const mu = d.params["mu"] ?? 0;
      const sigma = d.params["sigma"] ?? 0;
      return Math.exp(mu + (sigma * sigma) / 2);
    }
    case DistributionType.Uniform: {
      const min = d.params["min"] ?? 0;
      const max = d.params["max"] ?? 1;
      return (min + max) / 2;
    }
    case DistributionType.Fixed:
      return d.params["value"] ?? 1;
    case DistributionType.Poisson:
      return d.params["lambda"] ?? 1;
    default:
      return 1;
  }
}

export const itemCatalogProjection: Projection<ItemCatalogState> = {
  initial: { items: new Map(), stageMeans: {} },

  reduce(state, event: SimulationEvent): ItemCatalogState {
    if (event.type === "simulation_started") {
      const stageMeans: Record<string, number> = {};
      for (const s of event.config.stages) {
        stageMeans[s.id] = distributionMean(s.serviceTime);
      }
      return { items: new Map(), stageMeans };
    }

    if (event.type === "item_arrived") {
      const items = new Map(state.items);
      items.set(event.itemId, {
        id: event.item.id,
        blocked: false,
        classOfService: event.item.classOfService,
        type: event.item.type,
        title: workItemTitle(event.item.id),
        createdAt: event.item.createdAt,
        currentStageId: null,
        workStartedAt: null,
      });
      return { ...state, items };
    }

    if (event.type === "item_pulled") {
      const existing = state.items.get(event.itemId);
      if (!existing) return state;
      const items = new Map(state.items);
      items.set(event.itemId, {
        ...existing,
        currentStageId: event.stageId,
        workStartedAt: null,
      });
      return { ...state, items };
    }

    if (event.type === "work_started") {
      const existing = state.items.get(event.itemId);
      if (!existing) return state;
      const items = new Map(state.items);
      items.set(event.itemId, {
        ...existing,
        currentStageId: event.stageId,
        workStartedAt: event.time,
      });
      return { ...state, items };
    }

    if (event.type === "work_completed") {
      const existing = state.items.get(event.itemId);
      if (!existing) return state;
      const items = new Map(state.items);
      items.set(event.itemId, { ...existing, workStartedAt: null });
      return { ...state, items };
    }

    if (event.type === "item_delivered") {
      const existing = state.items.get(event.itemId);
      if (!existing) return state;
      const items = new Map(state.items);
      items.set(event.itemId, {
        ...existing,
        currentStageId: null,
        workStartedAt: null,
      });
      return { ...state, items };
    }

    if (event.type === "item_blocked") {
      const existing = state.items.get(event.itemId);
      if (!existing) return state;
      const items = new Map(state.items);
      items.set(event.itemId, { ...existing, blocked: true });
      return { ...state, items };
    }

    if (event.type === "item_unblocked") {
      const existing = state.items.get(event.itemId);
      if (!existing) return state;
      const items = new Map(state.items);
      items.set(event.itemId, { ...existing, blocked: false });
      return { ...state, items };
    }

    return state;
  },
};
