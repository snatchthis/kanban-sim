import { useRef } from "react";
import { useConfigStore } from "@/store/config-store";
import { configFromUrl, seedFromUrl } from "@/utils/url-state";

export function useConfigFromUrl() {
  const applied = useRef(false);

  if (!applied.current) {
    applied.current = true;
    const { setBoard, setSeed } = useConfigStore.getState();
    const cfg = configFromUrl();
    if (cfg) setBoard(cfg);
    const seed = seedFromUrl();
    if (seed != null) setSeed(seed);
  }
}
