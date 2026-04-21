import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface CfdDataPoint {
  time: number;
  backlog: number;
  done: number;
  stages: Record<string, number>;
}

/**
 * CFD projection output. Each data point records *instantaneous populations*
 * (current items in backlog / each stage / done) at the time of the event.
 *
 * In a forward-flow system these values equal the widths of the bands in
 * a standard Cumulative Flow Diagram — so the chart layer renders them by
 * stacking in cumulative order (done at bottom, backlog at top). If rework
 * is ever introduced, these band-width values will no longer correspond to
 * cumulative-entry differences, and the projection will need real monotonic
 * counters (cumArrivals, cumEntered[stageId], cumDelivered).
 */
export interface CfdData {
  dataPoints: CfdDataPoint[];
  itemLocation: Record<string, string>;
  backlogCount: number;
  doneCount: number;
  stageCounts: Record<string, number>;
}

const BACKLOG = "__backlog__";
const DONE = "__done__";

function snapshotPoint(state: CfdData, time: number): CfdDataPoint {
  return {
    time,
    backlog: state.backlogCount,
    done: state.doneCount,
    stages: { ...state.stageCounts },
  };
}

export const cfdProjection: Projection<CfdData> = {
  initial: {
    dataPoints: [],
    itemLocation: {},
    backlogCount: 0,
    doneCount: 0,
    stageCounts: {},
  },
  reduce: (state, event: SimulationEvent) => {
    if (event.type === "simulation_started") {
      const stageCounts: Record<string, number> = {};
      for (const s of event.config.stages) stageCounts[s.id] = 0;
      const next: CfdData = {
        dataPoints: [],
        itemLocation: {},
        backlogCount: 0,
        doneCount: 0,
        stageCounts,
      };
      return { ...next, dataPoints: [snapshotPoint(next, event.time)] };
    }

    if (event.type === "item_arrived") {
      const itemLocation = { ...state.itemLocation, [event.itemId]: BACKLOG };
      const backlogCount = state.backlogCount + 1;
      const next: CfdData = { ...state, itemLocation, backlogCount };
      return { ...next, dataPoints: [...state.dataPoints, snapshotPoint(next, event.time)] };
    }

    if (event.type === "item_pulled") {
      const from = state.itemLocation[event.itemId];
      const itemLocation = { ...state.itemLocation, [event.itemId]: event.stageId };
      let backlogCount = state.backlogCount;
      const stageCounts = { ...state.stageCounts };
      if (from === BACKLOG) {
        backlogCount -= 1;
      } else if (from !== undefined && from !== DONE) {
        stageCounts[from] = (stageCounts[from] ?? 0) - 1;
      }
      stageCounts[event.stageId] = (stageCounts[event.stageId] ?? 0) + 1;
      const next: CfdData = { ...state, itemLocation, backlogCount, stageCounts };
      return { ...next, dataPoints: [...state.dataPoints, snapshotPoint(next, event.time)] };
    }

    if (event.type === "item_delivered") {
      const from = state.itemLocation[event.itemId];
      const itemLocation = { ...state.itemLocation, [event.itemId]: DONE };
      const stageCounts = { ...state.stageCounts };
      if (from !== undefined && from !== BACKLOG && from !== DONE) {
        stageCounts[from] = (stageCounts[from] ?? 0) - 1;
      }
      const doneCount = state.doneCount + 1;
      const next: CfdData = { ...state, itemLocation, stageCounts, doneCount };
      return { ...next, dataPoints: [...state.dataPoints, snapshotPoint(next, event.time)] };
    }

    return state;
  },
};
