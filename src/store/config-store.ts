import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { BoardConfig } from "@/engine/types";
import { defaultBoard } from "@/utils/presets";

interface ConfigState {
  board: BoardConfig;
  seed: number;
}

interface ConfigActions {
  setBoard: (board: BoardConfig) => void;
  setSeed: (seed: number) => void;
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
    reset: () => set(initialConfig),
  }))
);
