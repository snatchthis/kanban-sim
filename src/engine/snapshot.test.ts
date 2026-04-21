import { describe, it, expect } from "vitest";
import { runSimulation } from "./simulation";
import type {
  BoardConfig,
  BoardState,
  SimulationConfig,
  SimulationEvent,
  Snapshot,
  StageConfig,
} from "./types";
import { DistributionType, PullPolicyType, WipPolicyType } from "./types";
import { createInitialState } from "./state";
import {
  applyEventToBoardState,
  reconstructState,
  reconstructStateAt,
  findNearestSnapshotByIndex,
} from "./snapshot";

function stage(id: string, overrides: Partial<StageConfig> = {}): StageConfig {
  return {
    id,
    name: id,
    wipLimit: null,
    serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
    workers: 1,
    hasSubColumns: false,
    ...overrides,
  };
}

function board(overrides: Partial<BoardConfig> = {}): BoardConfig {
  return {
    stages: [stage("s1")],
    arrivalRate: { type: DistributionType.Fixed, params: { value: 1 } },
    pullPolicy: PullPolicyType.FIFO,
    wipPolicy: WipPolicyType.Strict,
    batchSize: 1,
    simulationDuration: 10,
    ...overrides,
  };
}

function config(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return { board: board(), seed: 1, ...overrides };
}

function emptyState(): BoardState {
  return createInitialState(board({ stages: [stage("s1"), stage("s2")] }));
}

describe("applyEventToBoardState", () => {
  it("sets currentTime on simulation_started", () => {
    const state = emptyState();
    const event: SimulationEvent = {
      type: "simulation_started",
      time: 5,
      config: board(),
      seed: 1,
    };
    const result = applyEventToBoardState(state, event);
    expect(result.currentTime).toBe(5);
    expect(result.backlog).toEqual([]);
    expect(result.done).toEqual([]);
    expect(result.stages).toHaveLength(2);
    expect(result.stages[0]!.items).toEqual([]);
    expect(result.stages[1]!.items).toEqual([]);
  });

  it("appends itemId to backlog on item_arrived", () => {
    const state = emptyState();
    const event: SimulationEvent = {
      type: "item_arrived",
      time: 3,
      itemId: "W-1",
      item: {
        id: "W-1",
        type: expect.anything() as never,
        classOfService: expect.anything() as never,
        estimatedSize: 1,
        createdAt: 3,
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
    const result = applyEventToBoardState(state, event);
    expect(result.backlog).toEqual(["W-1"]);
    expect(result.currentTime).toBe(3);
  });

  it("moves item from backlog to target stage on item_pulled", () => {
    let state: BoardState = {
      ...emptyState(),
      backlog: ["W-1", "W-2"],
    };
    const event: SimulationEvent = {
      type: "item_pulled",
      time: 4,
      itemId: "W-1",
      stageId: "s1",
    };
    const result = applyEventToBoardState(state, event);
    expect(result.backlog).toEqual(["W-2"]);
    expect(result.stages[0]!.items).toEqual(["W-1"]);
    expect(result.currentTime).toBe(4);
  });

  it("moves item between stages on item_pulled from intermediate stage", () => {
    let state: BoardState = {
      ...emptyState(),
      stages: [
        { ...emptyState().stages[0]!, items: ["W-1"] },
        { ...emptyState().stages[1]!, items: [] },
      ],
    };
    const event: SimulationEvent = {
      type: "item_pulled",
      time: 7,
      itemId: "W-1",
      stageId: "s2",
    };
    const result = applyEventToBoardState(state, event);
    expect(result.stages[0]!.items).toEqual([]);
    expect(result.stages[1]!.items).toEqual(["W-1"]);
    expect(result.currentTime).toBe(7);
  });

  it("removes item from stage and appends to done on item_delivered", () => {
    let state: BoardState = {
      ...emptyState(),
      stages: [
        { ...emptyState().stages[0]!, items: ["W-1", "W-2"] },
        { ...emptyState().stages[1]!, items: [] },
      ],
    };
    const event: SimulationEvent = {
      type: "item_delivered",
      time: 9,
      itemId: "W-1",
      totalLeadTime: 5,
    };
    const result = applyEventToBoardState(state, event);
    expect(result.stages[0]!.items).toEqual(["W-2"]);
    expect(result.done).toEqual(["W-1"]);
    expect(result.currentTime).toBe(9);
  });

  it("only updates currentTime for work_started", () => {
    const state = emptyState();
    const event: SimulationEvent = {
      type: "work_started",
      time: 6,
      itemId: "W-1",
      stageId: "s1",
    };
    const result = applyEventToBoardState(state, event);
    expect(result.currentTime).toBe(6);
    expect(result.backlog).toEqual(state.backlog);
    expect(result.done).toEqual(state.done);
    expect(result.stages).toEqual(state.stages);
  });

  it("only updates currentTime for work_completed", () => {
    const state = emptyState();
    const event: SimulationEvent = {
      type: "work_completed",
      time: 8,
      itemId: "W-1",
      stageId: "s1",
    };
    const result = applyEventToBoardState(state, event);
    expect(result.currentTime).toBe(8);
    expect(result.backlog).toEqual(state.backlog);
  });

  it("only updates currentTime for item_blocked", () => {
    const state = emptyState();
    const event: SimulationEvent = {
      type: "item_blocked",
      time: 2,
      itemId: "W-1",
      reason: "waiting",
    };
    const result = applyEventToBoardState(state, event);
    expect(result.currentTime).toBe(2);
  });

  it("only updates currentTime for item_unblocked", () => {
    const state = emptyState();
    const event: SimulationEvent = {
      type: "item_unblocked",
      time: 3,
      itemId: "W-1",
    };
    const result = applyEventToBoardState(state, event);
    expect(result.currentTime).toBe(3);
  });

  it("only updates currentTime for stage_wip_changed", () => {
    const state = emptyState();
    const event: SimulationEvent = {
      type: "stage_wip_changed",
      time: 4,
      stageId: "s1",
      wip: 2,
    };
    const result = applyEventToBoardState(state, event);
    expect(result.currentTime).toBe(4);
  });

  it("only updates currentTime for simulation_ended", () => {
    const state = { ...emptyState(), currentTime: 50 };
    const event: SimulationEvent = {
      type: "simulation_ended",
      time: 10,
    };
    const result = applyEventToBoardState(state, event);
    expect(result.currentTime).toBe(10);
  });

  it("does not mutate the input state", () => {
    const original: BoardState = {
      stages: [
        { id: "s1", name: "s1", items: ["W-1"], wipLimit: null, workers: 1 },
      ],
      backlog: ["W-2"],
      done: [],
      currentTime: 0,
    };
    const frozen = structuredClone(original);
    const event: SimulationEvent = {
      type: "item_pulled",
      time: 1,
      itemId: "W-2",
      stageId: "s1",
    };
    applyEventToBoardState(original, event);
    expect(original).toEqual(frozen);
  });
});

describe("reconstructStateAt", () => {
  const cfg = config({
    board: board({
      stages: [
        stage("s1", {
          serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
        }),
      ],
      arrivalRate: { type: DistributionType.Fixed, params: { value: 1 } },
      simulationDuration: 10,
    }),
  });
  const result = runSimulation(cfg);

  it("replaying entire event stream from no snapshot equals finalState", () => {
    const state = reconstructStateAt(null, result.events, result.events.length - 1);
    expect(state).toEqual(result.finalState);
  });

  it("replaying to index 0 returns the initial board state", () => {
    const state = reconstructStateAt(null, result.events, 0);
    const firstEvent = result.events[0]!;
    expect(firstEvent.type).toBe("simulation_started");
    if (firstEvent.type === "simulation_started") {
      const expected = createInitialState(firstEvent.config);
      expected.currentTime = firstEvent.time;
      expect(state).toEqual(expected);
    }
  });

  it("snapshot-accelerated replay equals from-scratch replay", () => {
    if (result.snapshots.length === 0) return;
    const targetIndex = result.events.length - 1;
    const snap = result.snapshots[result.snapshots.length - 1]!;
    const fromScratch = reconstructStateAt(null, result.events, targetIndex);
    const fromSnap = reconstructStateAt(snap, result.events, targetIndex);
    expect(fromSnap).toEqual(fromScratch);
  });

  it("does not mutate snapshot state", () => {
    if (result.snapshots.length === 0) return;
    const snap = result.snapshots[0]!;
    const preClone = structuredClone(snap.state);
    reconstructStateAt(snap, result.events, result.events.length - 1);
    expect(snap.state).toEqual(preClone);
  });

  it("returns seed state for negative targetEventIndex", () => {
    const state = reconstructStateAt(null, result.events, -1);
    const firstEvent = result.events[0]!;
    if (firstEvent.type === "simulation_started") {
      const expected = createInitialState(firstEvent.config);
      expect(state).toEqual(expected);
    }
  });

  it("throws on empty events array", () => {
    expect(() => reconstructStateAt(null, [], 0)).toThrow();
  });
});

describe("reconstructState (time-based)", () => {
  const cfg = config({
    board: board({
      stages: [
        stage("s1", {
          serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
        }),
      ],
      arrivalRate: { type: DistributionType.Fixed, params: { value: 2 } },
      simulationDuration: 10,
    }),
  });
  const result = runSimulation(cfg);

  it("returns state at the last event before or at targetTime", () => {
    const targetTime = result.events[result.events.length - 1]!.time;
    const state = reconstructState(null, result.events, targetTime);
    const atIndex = reconstructStateAt(
      null,
      result.events,
      result.events.length - 1,
    );
    expect(state).toEqual(atIndex);
  });

  it("returns initial state for targetTime 0", () => {
    const state = reconstructState(null, result.events, 0);
    const firstEvent = result.events[0]!;
    if (firstEvent.type === "simulation_started") {
      const expected = createInitialState(firstEvent.config);
      expected.currentTime = firstEvent.time;
      expect(state).toEqual(expected);
    }
  });
});

describe("findNearestSnapshotByIndex", () => {
  it("returns the snapshot with highest eventIndex <= target", () => {
    const snapshots: Snapshot[] = [
      { time: 0, state: {} as BoardState, eventIndex: 0 },
      { time: 10, state: {} as BoardState, eventIndex: 100 },
      { time: 20, state: {} as BoardState, eventIndex: 200 },
    ];
    expect(findNearestSnapshotByIndex(snapshots, 150)).toBe(snapshots[1]);
    expect(findNearestSnapshotByIndex(snapshots, 200)).toBe(snapshots[2]);
    expect(findNearestSnapshotByIndex(snapshots, 300)).toBe(snapshots[2]);
  });

  it("returns null when no snapshot has eventIndex <= target", () => {
    const snapshots: Snapshot[] = [
      { time: 10, state: {} as BoardState, eventIndex: 100 },
    ];
    expect(findNearestSnapshotByIndex(snapshots, 50)).toBeNull();
  });

  it("returns null for empty snapshots", () => {
    expect(findNearestSnapshotByIndex([], 0)).toBeNull();
  });
});
