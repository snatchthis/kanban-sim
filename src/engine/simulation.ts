import type {
  SimulationConfig,
  SimulationEvent,
  SimulationResult,
  Snapshot,
  StageConfig,
  StageEntry,
  WorkItem,
} from "./types";
import { ClassOfService, WorkItemType } from "./types";
import { createEventQueue } from "./event-queue";
import { createInitialState } from "./state";
import { createSnapshot, shouldTakeSnapshot } from "./snapshot";
import { createPRNG } from "./random/prng";
import { nextArrivalTime } from "./policies/arrival";
import { computeServiceTime } from "./policies/service-time";
import { getPullPolicy } from "./policies/pull";
import { getWipPolicy } from "./policies/wip";

export function runSimulation(config: SimulationConfig): SimulationResult {
  const { board, seed } = config;
  const prng = createPRNG(seed);
  const queue = createEventQueue();
  const events: SimulationEvent[] = [];
  const snapshots: Snapshot[] = [];
  const items = new Map<string, WorkItem>();

  const pull = getPullPolicy(board.pullPolicy);
  const wipOk = getWipPolicy(board.wipPolicy);

  let state = createInitialState(board);
  let itemCounter = 0;
  const genId = (): string => `W-${++itemCounter}`;

  const stageIndexById = new Map<string, number>();
  board.stages.forEach((s, i) => stageIndexById.set(s.id, i));

  // items that have completed work at their current stage but haven't advanced
  const readyToAdvance = new Map<string, string[]>();
  for (const s of board.stages) readyToAdvance.set(s.id, []);

  function makeWorkItem(id: string, time: number): WorkItem {
    return {
      id,
      type: WorkItemType.Feature,
      classOfService: ClassOfService.Standard,
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
    };
  }

  function scheduleArrival(time: number): void {
    if (time > board.simulationDuration) return;
    const id = genId();
    const item = makeWorkItem(id, time);
    items.set(id, item);
    queue.push(time, { type: "item_arrived", time, itemId: id, item });
  }

  function emitWipChanged(time: number, stageId: string): void {
    const s = state.stages.find((x) => x.id === stageId);
    if (!s) return;
    events.push({ type: "stage_wip_changed", time, stageId, wip: s.items.length });
  }

  function enterStage(
    time: number,
    itemId: string,
    targetStageIndex: number,
    fromBacklog: boolean,
    fromStageId: string | null
  ): void {
    const stageCfg: StageConfig = board.stages[targetStageIndex]!;
    const item = items.get(itemId)!;

    if (fromBacklog) {
      state = { ...state, backlog: state.backlog.filter((id) => id !== itemId) };
    } else if (fromStageId !== null) {
      state = {
        ...state,
        stages: state.stages.map((s) =>
          s.id === fromStageId
            ? { ...s, items: s.items.filter((id) => id !== itemId) }
            : s
        ),
      };
      const prior = item.stageHistory[item.stageHistory.length - 1];
      if (prior && prior.stageId === fromStageId && prior.exitedAt === null) {
        prior.exitedAt = time;
        prior.waitTime = time - prior.enteredAt - prior.activeTime;
      }
      const ready = readyToAdvance.get(fromStageId);
      if (ready) {
        const idx = ready.indexOf(itemId);
        if (idx >= 0) ready.splice(idx, 1);
      }
    }

    state = {
      ...state,
      stages: state.stages.map((s) =>
        s.id === stageCfg.id ? { ...s, items: [...s.items, itemId] } : s
      ),
    };

    if (item.enteredAt === null) item.enteredAt = time;
    item.currentStage = stageCfg.id;
    const entry: StageEntry = {
      stageId: stageCfg.id,
      enteredAt: time,
      exitedAt: null,
      waitTime: 0,
      activeTime: 0,
    };
    item.stageHistory.push(entry);

    events.push({ type: "item_pulled", time, itemId, stageId: stageCfg.id });
    emitWipChanged(time, stageCfg.id);
    if (fromStageId !== null) emitWipChanged(time, fromStageId);
    events.push({ type: "work_started", time, itemId, stageId: stageCfg.id });

    const svcTime = computeServiceTime(prng, item, stageCfg);
    queue.push(time + svcTime, {
      type: "work_completed",
      time: time + svcTime,
      itemId,
      stageId: stageCfg.id,
    });
  }

  function tryAdvanceFrom(time: number, fromStageIndex: number): void {
    const fromStage = board.stages[fromStageIndex];
    if (!fromStage) return;
    const nextIndex = fromStageIndex + 1;
    const nextStage = board.stages[nextIndex];
    if (!nextStage) return;
    const ready = readyToAdvance.get(fromStage.id);
    if (!ready) return;
    while (ready.length > 0) {
      const itemId = ready[0]!;
      const item = items.get(itemId)!;
      const currentNextState = state.stages.find((s) => s.id === nextStage.id)!;
      if (!wipOk(currentNextState, item)) break;
      enterStage(time, itemId, nextIndex, false, fromStage.id);
    }
  }

  function tryPullIntoFirstStage(time: number): void {
    if (board.stages.length === 0) return;
    const stageCfg = board.stages[0]!;
    while (state.backlog.length > 0) {
      const stageState = state.stages.find((s) => s.id === stageCfg.id)!;
      const backlogItems = state.backlog.map((id) => items.get(id)!);
      const picked = pull(backlogItems, stageState);
      if (!picked) break;
      if (!wipOk(stageState, picked)) break;
      enterStage(time, picked.id, 0, true, null);
    }
  }

  events.push({ type: "simulation_started", time: 0, config: board, seed });

  scheduleArrival(nextArrivalTime(prng, 0, board.arrivalRate));

  while (!queue.isEmpty()) {
    const entry = queue.pop();
    if (!entry) break;
    if (entry.time > board.simulationDuration) break;

    const event = entry.event;
    events.push(event);
    state = { ...state, currentTime: event.time };

    if (event.type === "item_arrived") {
      state = { ...state, backlog: [...state.backlog, event.itemId] };
      scheduleArrival(nextArrivalTime(prng, event.time, board.arrivalRate));
      tryPullIntoFirstStage(event.time);
    } else if (event.type === "work_completed") {
      const stageIdx = stageIndexById.get(event.stageId);
      const item = items.get(event.itemId);
      if (stageIdx === undefined || !item) continue;
      const last = item.stageHistory[item.stageHistory.length - 1];
      if (last && last.stageId === event.stageId) {
        last.activeTime = event.time - last.enteredAt;
      }

      const isTerminal = stageIdx === board.stages.length - 1;
      if (isTerminal) {
        const totalLeadTime = event.time - item.createdAt;
        item.deliveredAt = event.time;
        if (last && last.exitedAt === null) {
          last.exitedAt = event.time;
          last.waitTime = event.time - last.enteredAt - last.activeTime;
        }
        state = {
          ...state,
          stages: state.stages.map((s) =>
            s.id === event.stageId
              ? { ...s, items: s.items.filter((id) => id !== event.itemId) }
              : s
          ),
          done: [...state.done, event.itemId],
        };
        item.currentStage = null;
        events.push({
          type: "item_delivered",
          time: event.time,
          itemId: event.itemId,
          totalLeadTime,
        });
        emitWipChanged(event.time, event.stageId);
        if (stageIdx > 0) tryAdvanceFrom(event.time, stageIdx - 1);
        tryPullIntoFirstStage(event.time);
      } else {
        const ready = readyToAdvance.get(event.stageId);
        if (ready && !ready.includes(event.itemId)) ready.push(event.itemId);
        tryAdvanceFrom(event.time, stageIdx);
        if (stageIdx > 0) tryAdvanceFrom(event.time, stageIdx - 1);
        tryPullIntoFirstStage(event.time);
      }
    }

    if (shouldTakeSnapshot(events.length - 1)) {
      snapshots.push(createSnapshot(event.time, state, events.length - 1));
    }
  }

  events.push({
    type: "simulation_ended",
    time: Math.min(state.currentTime, board.simulationDuration),
  });

  return { events, snapshots, finalState: state };
}
