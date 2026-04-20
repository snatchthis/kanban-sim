import type { SimulationEvent } from "@/engine/types";

export interface Projection<T> {
  initial: T;
  reduce: (state: T, event: SimulationEvent) => T;
}

export interface ProjectionResult<T> {
  data: T;
  lastEventIndex: number;
}
