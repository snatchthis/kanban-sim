import { describe, it, expect } from "vitest";
import type { SimulationEvent } from "@/engine/types";
import { ClassOfService, WorkItemType } from "@/engine/types";
import type { Projection } from "./types";
import {
  itemCatalogProjection,
  type ItemCatalogState,
} from "./item-catalog";

function fold(
  p: Projection<ItemCatalogState>,
  events: SimulationEvent[],
): ItemCatalogState {
  let state = p.initial;
  for (const e of events) state = p.reduce(state, e);
  return state;
}

function arrived(
  itemId: string,
  cos = ClassOfService.Standard,
  time = 1,
): SimulationEvent {
  return {
    type: "item_arrived",
    time,
    itemId,
    item: {
      id: itemId,
      type: WorkItemType.Feature,
      classOfService: cos,
      estimatedSize: 1,
      createdAt: time,
      enteredAt: null,
      deliveredAt: null,
      currentStage: null,
      blocked: false,
      blockReason: null,
      blockedAt: null,
      blockedDuration: 0,
      stageHistory: [],
    },
  };
}

describe("itemCatalogProjection", () => {
  it("starts with an empty catalog", () => {
    expect(itemCatalogProjection.initial.items.size).toBe(0);
  });

  it("adds an item after item_arrived", () => {
    const { items } = fold(itemCatalogProjection, [arrived("W-1")]);
    expect(items.has("W-1")).toBe(true);
    const item = items.get("W-1")!;
    expect(item.id).toBe("W-1");
    expect(item.classOfService).toBe(ClassOfService.Standard);
    expect(item.blocked).toBe(false);
    expect(item.createdAt).toBe(1);
  });

  it("sets blocked to true after item_blocked", () => {
    const events: SimulationEvent[] = [
      arrived("W-1"),
      { type: "item_blocked", time: 2, itemId: "W-1", reason: "dependency" },
    ];
    const { items } = fold(itemCatalogProjection, events);
    expect(items.get("W-1")!.blocked).toBe(true);
  });

  it("sets blocked to false after item_unblocked", () => {
    const events: SimulationEvent[] = [
      arrived("W-1"),
      { type: "item_blocked", time: 2, itemId: "W-1", reason: "dependency" },
      { type: "item_unblocked", time: 3, itemId: "W-1" },
    ];
    const { items } = fold(itemCatalogProjection, events);
    expect(items.get("W-1")!.blocked).toBe(false);
  });

  it("multiple items do not interfere", () => {
    const events: SimulationEvent[] = [
      arrived("W-1", ClassOfService.Expedite, 1),
      arrived("W-2", ClassOfService.Intangible, 2),
      { type: "item_blocked", time: 3, itemId: "W-1", reason: "blocked" },
    ];
    const { items } = fold(itemCatalogProjection, events);
    expect(items.size).toBe(2);
    expect(items.get("W-1")!.classOfService).toBe(ClassOfService.Expedite);
    expect(items.get("W-1")!.blocked).toBe(true);
    expect(items.get("W-2")!.classOfService).toBe(ClassOfService.Intangible);
    expect(items.get("W-2")!.blocked).toBe(false);
  });

  it("records work_started and clears on work_completed", () => {
    const events: SimulationEvent[] = [
      arrived("W-1"),
      { type: "item_pulled", time: 2, itemId: "W-1", stageId: "s1" },
      { type: "work_started", time: 2, itemId: "W-1", stageId: "s1" },
    ];
    const { items } = fold(itemCatalogProjection, events);
    expect(items.get("W-1")!.workStartedAt).toBe(2);
    expect(items.get("W-1")!.currentStageId).toBe("s1");

    const next = fold(itemCatalogProjection, [
      ...events,
      { type: "work_completed", time: 3, itemId: "W-1", stageId: "s1" },
    ]);
    expect(next.items.get("W-1")!.workStartedAt).toBeNull();
  });
});
