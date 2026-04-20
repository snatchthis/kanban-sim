import type { StageConfig, WorkItem } from "../types";
import type { PRNG } from "../random/prng";
import { sample } from "../random/distributions";

export type ServiceTimeModel = (
  rng: PRNG,
  item: WorkItem,
  stage: StageConfig
) => number;

export function computeServiceTime(
  rng: PRNG,
  _item: WorkItem,
  stage: StageConfig
): number {
  return Math.max(sample(rng, stage.serviceTime), 0);
}
