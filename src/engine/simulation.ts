import type {
  SimulationConfig,
  SimulationEvent,
  SimulationResult,
  WorkItem,
  ClassOfService,
  WorkItemType,
} from "./types";
import { createEventQueue } from "./event-queue";
import { createInitialState } from "./state";
import { createSnapshot, shouldTakeSnapshot } from "./snapshot";
import { createPRNG } from "./random/prng";

let itemIdCounter = 0;

function generateItemId(): string {
  itemIdCounter++;
  return `W-${itemIdCounter}`;
}

function generateWorkItem(time: number): WorkItem {
  return {
    id: generateItemId(),
    type: "feature" as WorkItemType,
    classOfService: "standard" as ClassOfService,
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

export function runSimulation(config: SimulationConfig): SimulationResult {
  void createPRNG(config.seed);
  const queue = createEventQueue();
  const events: SimulationEvent[] = [];
  const snapshots: SimulationResult["snapshots"] = [];

  let state = createInitialState(config.board);

  const startEvent: SimulationEvent = {
    type: "simulation_started",
    time: 0,
    config: config.board,
    seed: config.seed,
  };
  events.push(startEvent);

  queue.push(0, {
    type: "item_arrived",
    time: 0,
    itemId: generateItemId(),
    item: generateWorkItem(0),
  });

  while (!queue.isEmpty()) {
    const entry = queue.pop();
    if (!entry) break;
    if (entry.time > config.board.simulationDuration) break;

    const event = entry.event;
    events.push(event);
    state = { ...state, currentTime: event.time };

    if (shouldTakeSnapshot(events.length - 1)) {
      snapshots.push(createSnapshot(event.time, state, events.length - 1));
    }
  }

  const endEvent: SimulationEvent = {
    type: "simulation_ended",
    time: state.currentTime,
  };
  events.push(endEvent);

  return {
    events,
    snapshots,
    finalState: state,
  };
}
