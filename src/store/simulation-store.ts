import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { SimulationResult, SimulationConfig } from "@/engine/types";

export function hashConfig(config: SimulationConfig): string {
  return JSON.stringify(config);
}

interface SimulationState {
  isRunning: boolean;
  config: SimulationConfig | null;
  result: SimulationResult | null;
  currentEventIndex: number;
  lastRunConfigHash: string | null;
}

interface SimulationActions {
  start: (config: SimulationConfig) => void;
  complete: (result: SimulationResult) => void;
  setEventIndex: (index: number) => void;
  reset: () => void;
}

const initialState: SimulationState = {
  isRunning: false,
  config: null,
  result: null,
  currentEventIndex: 0,
  lastRunConfigHash: null,
};

export const useSimulationStore = create<SimulationState & SimulationActions>()(
  immer((set) => ({
    ...initialState,
    start: (config) =>
      set((state) => {
        state.isRunning = true;
        state.config = config;
        state.result = null;
        state.currentEventIndex = 0;
        state.lastRunConfigHash = hashConfig(config);
      }),
    complete: (result) =>
      set((state) => {
        state.isRunning = false;
        state.result = result;
      }),
    setEventIndex: (index) =>
      set((state) => {
        state.currentEventIndex = index;
      }),
    reset: () => set((state) => Object.assign(state, initialState)),
  }))
);
