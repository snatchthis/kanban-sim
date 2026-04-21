import { useEffect, useRef, useState, useCallback } from "react";
import { useUiStore } from "@/store/ui-store";
import { useSimulationStore } from "@/store/simulation-store";
import {
  createPlaybackController,
  type PlaybackController,
  type PlaybackSpeed,
  type PlaybackState,
} from "@/controller";

export function usePlayback() {
  const { playbackSpeed, setPlaybackSpeed } = useUiStore();
  const { result, currentEventIndex, setEventIndex } = useSimulationStore();

  const controllerRef = useRef<PlaybackController | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    speed: playbackSpeed,
    currentEventIndex,
  });

  useEffect(() => {
    if (!result) return;

    const ctrl = createPlaybackController({
      events: result.events,
      initialIndex: currentEventIndex,
      initialSpeed: playbackSpeed,
    });
    controllerRef.current = ctrl;

    const unsub = ctrl.subscribe((state) => {
      setPlaybackState(state);
      setEventIndex(state.currentEventIndex);
      setPlaybackSpeed(state.speed);
    });

    setPlaybackState(ctrl.getState());

    return () => {
      unsub();
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, [result]);

  const play = useCallback(() => controllerRef.current?.play(), []);
  const pause = useCallback(() => controllerRef.current?.pause(), []);
  const stepForward = useCallback(() => controllerRef.current?.step(), []);
  const stepBackward = useCallback(() => controllerRef.current?.stepBackward(), []);
  const seekTo = useCallback((i: number) => controllerRef.current?.seekTo(i), []);
  const seekToStart = useCallback(() => controllerRef.current?.seekTo(0), []);
  const seekToEnd = useCallback(() => {
    if (result) controllerRef.current?.seekTo(result.events.length - 1);
  }, [result]);
  const setSpeed = useCallback(
    (speed: PlaybackSpeed) => controllerRef.current?.setSpeed(speed),
    [],
  );

  return {
    isPlaying: playbackState.isPlaying,
    speed: playbackState.speed,
    currentEventIndex: playbackState.currentEventIndex,
    totalEvents: result?.events.length ?? 0,
    play,
    pause,
    stepForward,
    stepBackward,
    seekTo,
    seekToStart,
    seekToEnd,
    setSpeed,
  };
}
