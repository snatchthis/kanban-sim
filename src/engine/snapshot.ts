import type { BoardState, Snapshot, SimulationEvent } from "./types";
import {
  createInitialState,
  addItemToStage,
  removeItemFromStage,
  addToBacklog,
} from "./state";

const DEFAULT_SNAPSHOT_INTERVAL = 100;

export function createSnapshot(
  time: number,
  state: BoardState,
  eventIndex: number
): Snapshot {
  return {
    time,
    state: structuredClone(state),
    eventIndex,
  };
}

export function findNearestSnapshot(
  snapshots: Snapshot[],
  targetTime: number
): Snapshot | null {
  if (snapshots.length === 0) return null;

  let nearest = snapshots[0]!;
  for (const snapshot of snapshots) {
    if (snapshot.time <= targetTime) {
      nearest = snapshot;
    } else {
      break;
    }
  }
  return nearest;
}

export function findNearestSnapshotByIndex(
  snapshots: Snapshot[],
  targetIndex: number
): Snapshot | null {
  let best: Snapshot | null = null;
  for (const snap of snapshots) {
    if (snap.eventIndex <= targetIndex) {
      best = snap;
    } else {
      break;
    }
  }
  return best;
}

export function shouldTakeSnapshot(
  eventIndex: number,
  interval: number = DEFAULT_SNAPSHOT_INTERVAL
): boolean {
  return eventIndex > 0 && eventIndex % interval === 0;
}

function removeItem(state: BoardState, itemId: string): BoardState {
  const inBacklog = state.backlog.includes(itemId);
  if (inBacklog) {
    return { ...state, backlog: state.backlog.filter((id) => id !== itemId) };
  }
  return removeItemFromStage(state, itemId);
}

export function applyEventToBoardState(
  state: BoardState,
  event: SimulationEvent
): BoardState {
  switch (event.type) {
    case "simulation_started":
      return { ...state, currentTime: event.time };

    case "item_arrived":
      return { ...addToBacklog(state, event.itemId), currentTime: event.time };

    case "item_pulled": {
      const without = removeItem(state, event.itemId);
      return {
        ...addItemToStage(without, event.itemId, event.stageId),
        currentTime: event.time,
      };
    }

    case "item_delivered": {
      const without = removeItemFromStage(state, event.itemId);
      return {
        ...without,
        done: [...without.done, event.itemId],
        currentTime: event.time,
      };
    }

    case "work_started":
    case "work_completed":
    case "item_blocked":
    case "item_unblocked":
    case "stage_wip_changed":
    case "simulation_ended":
      return { ...state, currentTime: event.time };
  }
}

function seedState(events: SimulationEvent[]): BoardState {
  const first = events[0];
  if (!first || first.type !== "simulation_started") {
    throw new Error("Events array must start with simulation_started");
  }
  return createInitialState(first.config);
}

export function reconstructStateAt(
  snapshot: Snapshot | null,
  events: SimulationEvent[],
  targetEventIndex: number
): BoardState {
  if (events.length === 0) {
    throw new Error("Events array must not be empty");
  }

  let state: BoardState;
  let startIndex: number;

  if (snapshot && snapshot.eventIndex <= targetEventIndex) {
    state = structuredClone(snapshot.state);
    startIndex = snapshot.eventIndex + 1;
  } else {
    state = seedState(events);
    startIndex = 0;
  }

  if (targetEventIndex < 0) {
    return state;
  }

  const end = Math.min(targetEventIndex, events.length - 1);
  for (let i = startIndex; i <= end; i++) {
    state = applyEventToBoardState(state, events[i]!);
  }

  return state;
}

export function reconstructState(
  snapshot: Snapshot | null,
  events: SimulationEvent[],
  targetTime: number
): BoardState {
  let targetIndex = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i]!.time <= targetTime) {
      targetIndex = i;
    } else {
      break;
    }
  }
  if (targetIndex < 0) {
    targetIndex = 0;
  }
  return reconstructStateAt(snapshot, events, targetIndex);
}
