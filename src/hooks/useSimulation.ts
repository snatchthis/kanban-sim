import { useCallback, useMemo } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { useConfigStore } from "@/store/config-store";
import { runSimulation, reconstructStateAt, findNearestSnapshotByIndex } from "@/engine";

export function useSimulation() {
  const { isRunning, result, currentEventIndex, start, complete, setEventIndex, reset } =
    useSimulationStore();
  const { board, seed } = useConfigStore();

  const run = useCallback(() => {
    const config = { board, seed };
    start(config);
    const simResult = runSimulation(config);
    complete(simResult);
  }, [board, seed, start, complete]);

  const boardState = useMemo(() => {
    if (!result) return null;
    const nearest = findNearestSnapshotByIndex(result.snapshots, currentEventIndex);
    return reconstructStateAt(nearest, result.events, currentEventIndex);
  }, [result, currentEventIndex]);

  return {
    isRunning,
    result,
    currentEventIndex,
    boardState,
    run,
    setEventIndex,
    reset,
  };
}
