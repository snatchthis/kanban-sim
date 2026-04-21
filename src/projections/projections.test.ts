import { describe, it, expect } from "vitest";
import { runSimulation } from "@/engine/simulation";
import type { BoardConfig, SimulationConfig, SimulationEvent, StageConfig } from "@/engine/types";
import { DistributionType, PullPolicyType, WipPolicyType } from "@/engine/types";
import type { Projection } from "./types";
import { leadTimeProjection } from "./lead-time";
import { throughputProjection } from "./throughput";
import { cfdProjection } from "./cfd";
import { agingWipProjection } from "./aging-wip";
import { flowEfficiencyProjection } from "./flow-efficiency";
import { littlesLawProjection } from "./littles-law";

function stage(id: string, overrides: Partial<StageConfig> = {}): StageConfig {
  return {
    id,
    name: id,
    wipLimit: null,
    serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
    workers: 1,
    hasSubColumns: false,
    ...overrides,
  };
}

function board(overrides: Partial<BoardConfig> = {}): BoardConfig {
  return {
    stages: [stage("s1")],
    arrivalRate: { type: DistributionType.Fixed, params: { value: 1 } },
    pullPolicy: PullPolicyType.FIFO,
    wipPolicy: WipPolicyType.Strict,
    batchSize: 1,
    simulationDuration: 10,
    ...overrides,
  };
}

function cfg(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return { board: board(), seed: 1, ...overrides };
}

function fold<T>(p: Projection<T>, events: SimulationEvent[]): T {
  let state = p.initial;
  for (const e of events) state = p.reduce(state, e);
  return state;
}

function runAndFold<T>(p: Projection<T>, simConfig: SimulationConfig): T {
  const result = runSimulation(simConfig);
  return fold(p, result.events);
}

describe("throughputProjection", () => {
  it("counts deliveries into unit-length buckets", () => {
    // arrivals at 1..10, service 0.5, unlimited WIP → deliveries at 1.5, 2.5, ..., 9.5
    const data = runAndFold(
      throughputProjection,
      cfg({
        board: board({
          stages: [
            stage("s1", {
              wipLimit: 100,
              serviceTime: { type: DistributionType.Fixed, params: { value: 0.5 } },
            }),
          ],
          simulationDuration: 10,
        }),
      })
    );
    expect(data.totalDelivered).toBe(9);
    // each delivery lands in its own bucket (1.5 → [1,2), 2.5 → [2,3), ...)
    expect(data.buckets.every((b) => b.count === 1)).toBe(true);
  });

  it("ignores non-delivery events", () => {
    const data = fold(throughputProjection, [
      { type: "item_arrived", time: 1, itemId: "W-1" } as unknown as SimulationEvent,
      { type: "work_started", time: 1, itemId: "W-1", stageId: "s1" },
    ]);
    expect(data.totalDelivered).toBe(0);
    expect(data.buckets).toHaveLength(0);
  });
});

describe("cfdProjection", () => {
  it("tracks backlog, stage, and done populations", () => {
    const result = runSimulation(
      cfg({
        board: board({
          stages: [
            stage("s1", {
              wipLimit: 1,
              serviceTime: { type: DistributionType.Fixed, params: { value: 2 } },
            }),
          ],
          arrivalRate: { type: DistributionType.Fixed, params: { value: 0.5 } },
          simulationDuration: 5,
        }),
      })
    );
    const data = fold(cfdProjection, result.events);
    // at the end: 0 in stage, backlog + done = total arrivals
    const arrivals = result.events.filter((e) => e.type === "item_arrived").length;
    const delivered = result.events.filter((e) => e.type === "item_delivered").length;
    expect(data.doneCount).toBe(delivered);
    expect(data.backlogCount + (data.stageCounts["s1"] ?? 0) + data.doneCount).toBe(arrivals);
    // every data point should have non-negative population counts
    for (const p of data.dataPoints) {
      expect(p.backlog).toBeGreaterThanOrEqual(0);
      expect(p.done).toBeGreaterThanOrEqual(0);
      for (const id in p.stages) expect(p.stages[id]).toBeGreaterThanOrEqual(0);
    }
  });

  it("cumulative total (backlog + stages + done) equals arrivals at every point", () => {
    const result = runSimulation(
      cfg({
        board: board({
          stages: [
            stage("s1", { serviceTime: { type: DistributionType.Fixed, params: { value: 1 } } }),
            stage("s2", { serviceTime: { type: DistributionType.Fixed, params: { value: 1 } } }),
          ],
          arrivalRate: { type: DistributionType.Fixed, params: { value: 1 } },
          simulationDuration: 10,
        }),
      })
    );
    const data = fold(cfdProjection, result.events);
    let arrivalsSoFar = 0;
    let pointIdx = 0;
    for (const e of result.events) {
      if (e.type === "item_arrived") arrivalsSoFar++;
      if (
        e.type === "item_arrived" ||
        e.type === "item_pulled" ||
        e.type === "item_delivered" ||
        e.type === "simulation_started"
      ) {
        const p = data.dataPoints[pointIdx]!;
        const total =
          p.backlog +
          p.done +
          Object.values(p.stages).reduce((a, b) => a + b, 0);
        expect(total).toBe(arrivalsSoFar);
        pointIdx++;
      }
    }
  });
});

describe("agingWipProjection", () => {
  it("tracks in-flight items with ages relative to latest event time", () => {
    const events: SimulationEvent[] = [
      { type: "simulation_started", time: 0, config: board(), seed: 1 },
      {
        type: "item_arrived",
        time: 1,
        itemId: "W-1",
        item: { id: "W-1" } as never,
      },
      { type: "item_pulled", time: 1, itemId: "W-1", stageId: "s1" },
      { type: "work_started", time: 1, itemId: "W-1", stageId: "s1" },
      { type: "work_completed", time: 3, itemId: "W-1", stageId: "s1" },
    ];
    const data = fold(agingWipProjection, events);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.itemId).toBe("W-1");
    expect(data.items[0]!.age).toBeCloseTo(2, 10); // 3 - 1
  });

  it("removes delivered items and records lead times for percentiles", () => {
    const data = runAndFold(
      agingWipProjection,
      cfg({
        board: board({
          stages: [
            stage("s1", {
              wipLimit: 100,
              serviceTime: { type: DistributionType.Fixed, params: { value: 0.5 } },
            }),
          ],
          simulationDuration: 10,
        }),
      })
    );
    expect(data.deliveredLeadTimes.length).toBeGreaterThan(0);
    expect(data.deliveredLeadTimes.every((t) => Math.abs(t - 0.5) < 1e-9)).toBe(true);
    expect(data.percentileLines.p50).toBeCloseTo(0.5, 10);
  });
});

describe("flowEfficiencyProjection", () => {
  it("efficiency is 100% when items flow without blocking", () => {
    const data = runAndFold(
      flowEfficiencyProjection,
      cfg({
        board: board({
          stages: [
            stage("s1", {
              wipLimit: 100,
              serviceTime: { type: DistributionType.Fixed, params: { value: 0.5 } },
            }),
          ],
          simulationDuration: 10,
        }),
      })
    );
    expect(data.items.length).toBeGreaterThan(0);
    for (const item of data.items) {
      expect(item.waitTime).toBeCloseTo(0, 10);
      expect(item.efficiency).toBeCloseTo(1, 10);
    }
    expect(data.averageEfficiency).toBeCloseTo(1, 10);
  });

  it("efficiency drops below 1 when items wait between stages", () => {
    // 2 stages, WIP=1 on stage 2, fast arrivals so items pile up
    const data = runAndFold(
      flowEfficiencyProjection,
      cfg({
        board: board({
          stages: [
            stage("s1", {
              wipLimit: 1,
              serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
            }),
            stage("s2", {
              wipLimit: 1,
              serviceTime: { type: DistributionType.Fixed, params: { value: 3 } },
            }),
          ],
          arrivalRate: { type: DistributionType.Fixed, params: { value: 1 } },
          simulationDuration: 20,
        }),
      })
    );
    expect(data.items.length).toBeGreaterThan(0);
    const hasWait = data.items.some((i) => i.waitTime > 0);
    expect(hasWait).toBe(true);
    expect(data.averageEfficiency).toBeLessThan(1);
  });
});

describe("littlesLawProjection", () => {
  it("L ≈ λ · W in a stable fixed-rate system", () => {
    // fast arrivals, slow service, WIP=5 cap so system reaches steady state
    const data = runAndFold(
      littlesLawProjection,
      cfg({
        board: board({
          stages: [
            stage("s1", {
              wipLimit: 5,
              serviceTime: { type: DistributionType.Fixed, params: { value: 2 } },
            }),
          ],
          arrivalRate: { type: DistributionType.Fixed, params: { value: 0.5 } },
          simulationDuration: 200,
        }),
      })
    );
    expect(data.totalDelivered).toBeGreaterThan(0);
    expect(data.averageWip).toBeGreaterThan(0);
    expect(data.averageThroughput).toBeGreaterThan(0);
    expect(data.averageLeadTime).toBeGreaterThan(0);
    // Little's Law must hold in steady state: W ≈ L / λ
    const diff = Math.abs(data.averageLeadTime - data.predictedLeadTime) / data.averageLeadTime;
    expect(diff).toBeLessThan(0.15);
    expect(data.isValid).toBe(true);
  });

  it("handles empty deliveries without NaN", () => {
    const data = runAndFold(
      littlesLawProjection,
      cfg({
        board: board({
          arrivalRate: { type: DistributionType.Fixed, params: { value: 100 } },
          simulationDuration: 5,
        }),
      })
    );
    expect(data.totalDelivered).toBe(0);
    expect(Number.isFinite(data.averageWip)).toBe(true);
    expect(Number.isFinite(data.averageThroughput)).toBe(true);
    expect(data.isValid).toBe(false);
  });
});

describe("leadTimeProjection (regression)", () => {
  it("still computes correct percentiles", () => {
    const data = runAndFold(
      leadTimeProjection,
      cfg({
        board: board({
          stages: [
            stage("s1", {
              wipLimit: 100,
              serviceTime: { type: DistributionType.Fixed, params: { value: 0.5 } },
            }),
          ],
          simulationDuration: 10,
        }),
      })
    );
    expect(data.items.length).toBe(9);
    expect(data.percentiles.p50).toBeCloseTo(0.5, 10);
    expect(data.percentiles.p95).toBeCloseTo(0.5, 10);
  });
});
