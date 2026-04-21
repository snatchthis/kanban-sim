import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface LittlesLawData {
  averageWip: number;
  averageThroughput: number;
  averageLeadTime: number;
  predictedLeadTime: number;
  isValid: boolean;
  // internals exposed for downstream use / debugging
  totalDelivered: number;
  totalLeadTime: number;
  elapsed: number;
  wipTimeIntegral: number;
  currentWipByStage: Record<string, number>;
  lastEventTime: number;
}

const TOLERANCE = 0.15;

function totalWip(byStage: Record<string, number>): number {
  let t = 0;
  for (const id in byStage) t += byStage[id] ?? 0;
  return t;
}

function derive(
  delivered: number,
  leadTimeSum: number,
  elapsed: number,
  wipIntegral: number
): Pick<
  LittlesLawData,
  "averageWip" | "averageThroughput" | "averageLeadTime" | "predictedLeadTime" | "isValid"
> {
  const averageWip = elapsed > 0 ? wipIntegral / elapsed : 0;
  const averageThroughput = elapsed > 0 ? delivered / elapsed : 0;
  const averageLeadTime = delivered > 0 ? leadTimeSum / delivered : 0;
  const predictedLeadTime = averageThroughput > 0 ? averageWip / averageThroughput : 0;
  const isValid =
    averageLeadTime > 0 &&
    predictedLeadTime > 0 &&
    Math.abs(averageLeadTime - predictedLeadTime) / averageLeadTime <= TOLERANCE;
  return { averageWip, averageThroughput, averageLeadTime, predictedLeadTime, isValid };
}

export const littlesLawProjection: Projection<LittlesLawData> = {
  initial: {
    averageWip: 0,
    averageThroughput: 0,
    averageLeadTime: 0,
    predictedLeadTime: 0,
    isValid: false,
    totalDelivered: 0,
    totalLeadTime: 0,
    elapsed: 0,
    wipTimeIntegral: 0,
    currentWipByStage: {},
    lastEventTime: 0,
  },
  reduce: (state, event: SimulationEvent) => {
    const dt = Math.max(0, event.time - state.lastEventTime);
    const currentWip = totalWip(state.currentWipByStage);
    const wipTimeIntegral = state.wipTimeIntegral + currentWip * dt;
    const elapsed = state.elapsed + dt;

    if (event.type === "simulation_started") {
      const currentWipByStage: Record<string, number> = {};
      for (const s of event.config.stages) currentWipByStage[s.id] = 0;
      return {
        ...state,
        currentWipByStage,
        lastEventTime: event.time,
      };
    }

    if (event.type === "stage_wip_changed") {
      const currentWipByStage = {
        ...state.currentWipByStage,
        [event.stageId]: event.wip,
      };
      const derived = derive(state.totalDelivered, state.totalLeadTime, elapsed, wipTimeIntegral);
      return {
        ...state,
        ...derived,
        wipTimeIntegral,
        elapsed,
        currentWipByStage,
        lastEventTime: event.time,
      };
    }

    if (event.type === "item_delivered") {
      const totalDelivered = state.totalDelivered + 1;
      const totalLeadTime = state.totalLeadTime + event.totalLeadTime;
      const derived = derive(totalDelivered, totalLeadTime, elapsed, wipTimeIntegral);
      return {
        ...state,
        ...derived,
        totalDelivered,
        totalLeadTime,
        wipTimeIntegral,
        elapsed,
        lastEventTime: event.time,
      };
    }

    if (event.type === "simulation_ended") {
      const derived = derive(state.totalDelivered, state.totalLeadTime, elapsed, wipTimeIntegral);
      return {
        ...state,
        ...derived,
        wipTimeIntegral,
        elapsed,
        lastEventTime: event.time,
      };
    }

    // Other events: advance clock so WIP integral stays accurate
    return {
      ...state,
      wipTimeIntegral,
      elapsed,
      lastEventTime: event.time,
    };
  },
};
