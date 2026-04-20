import type { DistributionConfig } from "../types";
import type { PRNG } from "../random/prng";
import { sample } from "../random/distributions";

export type ArrivalPattern = (
  rng: PRNG,
  currentTime: number,
  config: DistributionConfig
) => number;

export function nextArrivalTime(
  rng: PRNG,
  currentTime: number,
  config: DistributionConfig
): number {
  const interval = sample(rng, config);
  return currentTime + Math.max(interval, 0);
}
