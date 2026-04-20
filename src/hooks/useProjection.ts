import { useMemo } from "react";
import type { Projection } from "@/projections/types";
import { useSimulationStore } from "@/store/simulation-store";

export function useProjection<T>(projection: Projection<T>): T {
  const { result, currentEventIndex } = useSimulationStore();

  return useMemo(() => {
    if (!result) return projection.initial;

    let data = projection.initial;
    const events = result.events.slice(0, currentEventIndex + 1);
    for (const event of events) {
      data = projection.reduce(data, event);
    }
    return data;
  }, [result, currentEventIndex, projection]);
}
