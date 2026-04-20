import type { BoardConfig } from "@/engine/types";
import { DistributionType, PullPolicyType, WipPolicyType } from "@/engine/types";

const exp = (rate: number) => ({ type: DistributionType.Exponential, params: { rate } });

export const defaultBoard: BoardConfig = {
  stages: [
    { id: "analysis", name: "Analysis", wipLimit: 3, serviceTime: exp(1), workers: 1, hasSubColumns: false },
    { id: "dev", name: "Development", wipLimit: 3, serviceTime: exp(0.5), workers: 1, hasSubColumns: false },
    { id: "review", name: "Review", wipLimit: 2, serviceTime: exp(2), workers: 1, hasSubColumns: false },
    { id: "test", name: "Test", wipLimit: 2, serviceTime: exp(1), workers: 1, hasSubColumns: false },
  ],
  arrivalRate: exp(0.3),
  pullPolicy: PullPolicyType.FIFO,
  wipPolicy: WipPolicyType.Strict,
  batchSize: 1,
  simulationDuration: 100,
};

export const noWipLimits: BoardConfig = {
  ...defaultBoard,
  stages: defaultBoard.stages.map((s) => ({ ...s, wipLimit: null })),
};

export const bottleneck: BoardConfig = {
  ...defaultBoard,
  stages: defaultBoard.stages.map((s) =>
    s.id === "review" ? { ...s, serviceTime: exp(0.2) } : s
  ),
};

export const highVariability: BoardConfig = {
  ...defaultBoard,
  stages: defaultBoard.stages.map((s) => ({
    ...s,
    serviceTime: { type: DistributionType.LogNormal, params: { mu: 0, sigma: 2 } },
  })),
};
