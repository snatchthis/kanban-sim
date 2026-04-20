import { useCallback } from "react";
import { useUiStore } from "@/store/ui-store";
import { useSimulationStore } from "@/store/simulation-store";
import type { PlaybackSpeed } from "@/controller";

export function usePlayback() {
  const { playbackSpeed, setPlaybackSpeed } = useUiStore();
  const { result, currentEventIndex, setEventIndex, isRunning } =
    useSimulationStore();

  const stepForward = useCallback(() => {
    if (result && currentEventIndex < result.events.length - 1) {
      setEventIndex(currentEventIndex + 1);
    }
  }, [result, currentEventIndex, setEventIndex]);

  const stepBackward = useCallback(() => {
    if (currentEventIndex > 0) {
      setEventIndex(currentEventIndex - 1);
    }
  }, [currentEventIndex, setEventIndex]);

  const seekToStart = useCallback(() => {
    setEventIndex(0);
  }, [setEventIndex]);

  const seekToEnd = useCallback(() => {
    if (result) {
      setEventIndex(result.events.length - 1);
    }
  }, [result, setEventIndex]);

  return {
    isPlaying: isRunning,
    speed: playbackSpeed,
    currentEventIndex,
    totalEvents: result?.events.length ?? 0,
    setSpeed: setPlaybackSpeed as (speed: PlaybackSpeed) => void,
    stepForward,
    stepBackward,
    seekToStart,
    seekToEnd,
  };
}
