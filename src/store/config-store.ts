import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { BoardConfig, PullPolicyType } from "@/engine/types";
import { DistributionType } from "@/engine/types";
import { defaultBoard } from "@/utils/presets";

interface ConfigState {
  board: BoardConfig;
  seed: number;
}

interface ConfigActions {
  setBoard: (board: BoardConfig) => void;
  setSeed: (seed: number) => void;
  setArrivalRate: (rate: number) => void;
  setStageWorkers: (stageId: string, workers: number) => void;
  setStageWipLimit: (stageId: string, wipLimit: number | null) => void;
  setPullPolicy: (policy: PullPolicyType) => void;
  reset: () => void;
}

const initialConfig: ConfigState = {
  board: defaultBoard,
  seed: 42,
};

export const useConfigStore = create<ConfigState & ConfigActions>()(
  immer((set) => ({
    ...initialConfig,
    setBoard: (board) =>
      set((state) => {
        state.board = board;
      }),
    setSeed: (seed) =>
      set((state) => {
        state.seed = seed;
      }),
    setArrivalRate: (rate) =>
      set((state) => {
        state.board.arrivalRate = {
          type: DistributionType.Exponential,
          params: { rate },
        };
      }),
    setStageWorkers: (stageId, workers) =>
      set((state) => {
        const stage = state.board.stages.find((s) => s.id === stageId);
        if (stage) stage.workers = workers;
      }),
    setStageWipLimit: (stageId, wipLimit) =>
      set((state) => {
        const stage = state.board.stages.find((s) => s.id === stageId);
        if (stage) stage.wipLimit = wipLimit;
      }),
    setPullPolicy: (policy) =>
      set((state) => {
        state.board.pullPolicy = policy;
      }),
    reset: () => set(initialConfig),
  }))
);
