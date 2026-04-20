export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10 | 50;

export interface SchedulerState {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentTime: number;
  currentEventIndex: number;
}

export function createScheduler() {
  let state: SchedulerState = {
    isPlaying: false,
    speed: 1,
    currentTime: 0,
    currentEventIndex: 0,
  };

  return {
    getState: () => state,
    play: () => {
      state = { ...state, isPlaying: true };
    },
    pause: () => {
      state = { ...state, isPlaying: false };
    },
    step: () => {
      state = {
        ...state,
        currentEventIndex: state.currentEventIndex + 1,
      };
    },
    setSpeed: (speed: PlaybackSpeed) => {
      state = { ...state, speed };
    },
    seekTo: (eventIndex: number) => {
      state = { ...state, currentEventIndex: eventIndex };
    },
    reset: () => {
      state = {
        isPlaying: false,
        speed: 1,
        currentTime: 0,
        currentEventIndex: 0,
      };
    },
  };
}
