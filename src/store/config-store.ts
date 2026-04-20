import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { BoardConfig } from "@/engine/types";
import { DistributionType, PullPolicyType, WipPolicyType } from "@/engine/types";

interface ConfigState {
  board: BoardConfig;
  seed: number;
}

interface ConfigActions {
  setBoard: (board: BoardConfig) => void;
  setSeed: (seed: number) => void;
  reset: () => void;
}

const defaultBoard: BoardConfig = {
  stages: [
    {
      id: "analysis",
      name: "Analysis",
      wipLimit: 3,
      serviceTime: { type: DistributionType.Exponential, params: { rate: 1 } },
      workers: 1,
      hasSubColumns: false,
    },
    {
      id: "dev",
      name: "Development",
      wipLimit: 3,
      serviceTime: { type: DistributionType.Exponential, params: { rate: 0.5 } },
      workers: 1,
      hasSubColumns: false,
    },
    {
      id: "review",
      name: "Review",
      wipLimit: 2,
      serviceTime: { type: DistributionType.Exponential, params: { rate: 2 } },
      workers: 1,
      hasSubColumns: false,
    },
    {
      id: "test",
      name: "Test",
      wipLimit: 2,
      serviceTime: { type: DistributionType.Exponential, params: { rate: 1 } },
      workers: 1,
      hasSubColumns: false,
    },
  ],
  arrivalRate: { type: DistributionType.Exponential, params: { rate: 0.3 } },
  pullPolicy: PullPolicyType.FIFO,
  wipPolicy: WipPolicyType.Strict,
  batchSize: 1,
  simulationDuration: 100,
};

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
    reset: () => set(initialConfig),
  }))
);
