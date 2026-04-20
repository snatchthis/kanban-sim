import type { BoardState, Snapshot, SimulationEvent } from "./types";

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

export function shouldTakeSnapshot(
  eventIndex: number,
  interval: number = DEFAULT_SNAPSHOT_INTERVAL
): boolean {
  return eventIndex > 0 && eventIndex % interval === 0;
}

export function reconstructState(
  snapshot: Snapshot,
  events: SimulationEvent[],
  targetTime: number
): BoardState {
  let state = structuredClone(snapshot.state);

  for (let i = snapshot.eventIndex; i < events.length; i++) {
    const event = events[i]!;
    if (event.time > targetTime) break;
    state = { ...state, currentTime: event.time };
  }

  return state;
}
