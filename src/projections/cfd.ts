import type { SimulationEvent } from "@/engine/types";
import type { Projection } from "./types";

export interface CfdData {
  dataPoints: Array<{
    time: number;
    [stageName: string]: number;
  }>;
}

export const cfdProjection: Projection<CfdData> = {
  initial: {
    dataPoints: [],
  },
  reduce: (state, event: SimulationEvent) => {
    if (
      event.type !== "item_pulled" &&
      event.type !== "item_delivered" &&
      event.type !== "item_arrived" &&
      event.type !== "stage_wip_changed"
    ) {
      return state;
    }

    return {
      dataPoints: [
        ...state.dataPoints,
        { time: event.time },
      ],
    };
  },
};
