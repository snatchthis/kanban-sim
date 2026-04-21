import type { SimulationEvent } from "@/engine/types";

export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10 | 50;

export interface PlaybackState {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentEventIndex: number;
}

export interface PlaybackController {
  play(): void;
  pause(): void;
  step(): void;
  stepBackward(): void;
  seekTo(index: number): void;
  setSpeed(speed: PlaybackSpeed): void;
  reset(): void;
  getState(): PlaybackState;
  subscribe(listener: (state: PlaybackState) => void): () => void;
  dispose(): void;
}

export interface PlaybackControllerOptions {
  events: SimulationEvent[];
  initialIndex?: number;
  initialSpeed?: PlaybackSpeed;
  tickMs?: number;
  now?: () => number;
  scheduleTick?: (fn: () => void, ms: number) => () => void;
}

export function createPlaybackController(
  options: PlaybackControllerOptions
): PlaybackController {
  const {
    events,
    initialIndex = 0,
    initialSpeed = 1,
    tickMs = 16,
    now = () => Date.now(),
    scheduleTick = (fn, ms) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    },
  } = options;

  const lastIndex = events.length - 1;
  let isPlaying = false;
  let speed: PlaybackSpeed = initialSpeed;
  let currentEventIndex = Math.min(Math.max(initialIndex, 0), lastIndex);
  let currentSimTime = events[currentEventIndex]!.time;
  let lastWallTime = now();
  let cancelTick: (() => void) | null = null;
  let listeners: Set<(state: PlaybackState) => void> = new Set();

  function notify(): void {
    const state: PlaybackState = { isPlaying, speed, currentEventIndex };
    for (const listener of listeners) {
      listener(state);
    }
  }

  function scheduleNext(): void {
    cancelTick = scheduleTick(tick, tickMs);
  }

  function tick(): void {
    if (!isPlaying) return;

    const currentWallTime = now();
    const elapsed = currentWallTime - lastWallTime;
    lastWallTime = currentWallTime;

    currentSimTime += (elapsed * speed) / 1000;

    let targetIndex = currentEventIndex;
    for (let i = currentEventIndex + 1; i <= lastIndex; i++) {
      if (events[i]!.time <= currentSimTime) {
        targetIndex = i;
      } else {
        break;
      }
    }

    if (targetIndex !== currentEventIndex) {
      currentEventIndex = targetIndex;
    }

    if (currentEventIndex >= lastIndex) {
      isPlaying = false;
      cancelTick = null;
      notify();
      return;
    }

    scheduleNext();
    notify();
  }

  function play(): void {
    if (isPlaying) return;
    if (currentEventIndex >= lastIndex) return;
    isPlaying = true;
    lastWallTime = now();
    scheduleNext();
    notify();
  }

  function pause(): void {
    if (!isPlaying) return;
    isPlaying = false;
    if (cancelTick) {
      cancelTick();
      cancelTick = null;
    }
    notify();
  }

  function step(): void {
    if (isPlaying) pause();
    if (currentEventIndex >= lastIndex) return;
    currentEventIndex = Math.min(currentEventIndex + 1, lastIndex);
    currentSimTime = events[currentEventIndex]!.time;
    notify();
  }

  function stepBackward(): void {
    if (isPlaying) pause();
    if (currentEventIndex <= 0) return;
    currentEventIndex = Math.max(currentEventIndex - 1, 0);
    currentSimTime = events[currentEventIndex]!.time;
    notify();
  }

  function seekTo(index: number): void {
    const clamped = Math.min(Math.max(index, 0), lastIndex);
    if (clamped === currentEventIndex && currentSimTime === events[clamped]!.time) return;
    currentEventIndex = clamped;
    currentSimTime = events[currentEventIndex]!.time;
    notify();
  }

  function setSpeed(newSpeed: PlaybackSpeed): void {
    if (newSpeed === speed) return;
    speed = newSpeed;
    notify();
  }

  function reset(): void {
    if (isPlaying) {
      isPlaying = false;
      if (cancelTick) {
        cancelTick();
        cancelTick = null;
      }
    }
    if (currentEventIndex === 0 && !isPlaying) {
      currentEventIndex = 0;
      currentSimTime = events[0]!.time;
      notify();
      return;
    }
    currentEventIndex = 0;
    currentSimTime = events[0]!.time;
    notify();
  }

  function getState(): PlaybackState {
    return { isPlaying, speed, currentEventIndex };
  }

  function subscribe(listener: (state: PlaybackState) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function dispose(): void {
    if (cancelTick) {
      cancelTick();
      cancelTick = null;
    }
    listeners.clear();
  }

  return {
    play,
    pause,
    step,
    stepBackward,
    seekTo,
    setSpeed,
    reset,
    getState,
    subscribe,
    dispose,
  };
}
