import type { PlaybackSpeed } from "./scheduler";

export interface PlaybackState {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  canStepForward: boolean;
  canStepBackward: boolean;
}

export function createPlaybackController() {
  return {
    play: () => {},
    pause: () => {},
    step: () => {},
    setSpeed: (_speed: PlaybackSpeed) => {},
    seekTo: (_time: number) => {},
    reset: () => {},
  };
}
