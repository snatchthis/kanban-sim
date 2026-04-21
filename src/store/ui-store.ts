import { create } from "zustand";
import type { PlaybackSpeed } from "@/controller";

type ActiveTab = "board" | "charts" | "config";

interface UiState {
  activeTab: ActiveTab;
  playbackSpeed: PlaybackSpeed;
  showMetrics: boolean;
}

interface UiActions {
  setActiveTab: (tab: ActiveTab) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
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
