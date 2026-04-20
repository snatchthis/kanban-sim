import { useCallback } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { useConfigStore } from "@/store/config-store";
import { runSimulation } from "@/engine";

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

  return {
    isRunning,
    result,
    currentEventIndex,
    run,
    setEventIndex,
    reset,
  };
}
