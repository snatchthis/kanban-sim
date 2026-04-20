import type { WipPolicyType, StageState, WorkItem, ClassOfService } from "../types";

export type WipPolicy = (
  stage: StageState,
  item: WorkItem
) => boolean;

export function getWipPolicy(type: WipPolicyType): WipPolicy {
  switch (type) {
    case "strict":
      return strictWip;
    case "soft":
      return softWip;
    default:
      return strictWip;
  }
}

const strictWip: WipPolicy = (stage) => {
  if (stage.wipLimit === null) return true;
  return stage.items.length < stage.wipLimit;
};

const softWip: WipPolicy = (stage, item) => {
  if (stage.wipLimit === null) return true;
  if (item.classOfService === ("expedite" as ClassOfService)) return true;
  return stage.items.length < stage.wipLimit;
};
