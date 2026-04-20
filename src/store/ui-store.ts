import { create } from "zustand";

type ActiveTab = "board" | "charts" | "config";

interface UiState {
  activeTab: ActiveTab;
  playbackSpeed: number;
  showMetrics: boolean;
}

interface UiActions {
  setActiveTab: (tab: ActiveTab) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleMetrics: () => void;
}

export const useUiStore = create<UiState & UiActions>()((set) => ({
  activeTab: "board",
  playbackSpeed: 1,
  showMetrics: true,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  toggleMetrics: () => set((state) => ({ showMetrics: !state.showMetrics })),
}));
