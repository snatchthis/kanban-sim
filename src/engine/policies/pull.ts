import type { WorkItem } from "../types";
import type { PullPolicyType, StageState } from "../types";

export type PullPolicy = (
  queue: WorkItem[],
  stage: StageState
) => WorkItem | null;

export function getPullPolicy(type: PullPolicyType): PullPolicy {
  switch (type) {
    case "fifo":
      return fifo;
    case "shortest_first":
      return shortestFirst;
    case "cost_of_delay":
      return costOfDelay;
    case "priority":
      return priority;
    default:
      return fifo;
  }
}

const fifo: PullPolicy = (queue) => {
  return queue[0] ?? null;
};

const shortestFirst: PullPolicy = (queue) => {
  if (queue.length === 0) return null;
  return queue.reduce((min, item) =>
    item.estimatedSize < min.estimatedSize ? item : min
  );
};

const costOfDelay: PullPolicy = (queue) => {
  if (queue.length === 0) return null;
  return queue[0]!;
};

const priority: PullPolicy = (queue) => {
  if (queue.length === 0) return null;
  const order = ["expedite", "fixed_date", "standard", "intangible"] as const;
  for (const cos of order) {
    const found = queue.find((item) => item.classOfService === cos);
    if (found) return found;
  }
  return queue[0]!;
};
