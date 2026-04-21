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
    const deliveryBuckets = data.buckets.filter((b) => b.count > 0);
    expect(deliveryBuckets.every((b) => b.count === 1)).toBe(true);
  });

  it("extends horizon on non-delivery events without incrementing count", () => {
    const data = fold(throughputProjection, [
      { type: "item_arrived", time: 1, itemId: "W-1" } as unknown as SimulationEvent,
      { type: "work_started", time: 1, itemId: "W-1", stageId: "s1" },
    ]);
    expect(data.totalDelivered).toBe(0);
    expect(data.buckets.length).toBeGreaterThan(0);
    expect(data.buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("emits zero-count buckets for idle periods", () => {
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
          arrivalRate: { type: DistributionType.Fixed, params: { value: 1 } },
          simulationDuration: 10,
        }),
      })
    );
    expect(data.buckets.length).toBeGreaterThanOrEqual(9);
    expect(data.buckets.every((b) => b.count >= 0)).toBe(true);
    for (let i = 1; i < data.buckets.length; i++) {
      expect(data.buckets[i]!.periodStart).toBeCloseTo(
        data.buckets[i - 1]!.periodEnd,
        10,
      );
    }
  });

  it("averagePerPeriod uses observed horizon, not last-delivery horizon", () => {
    const events: SimulationEvent[] = [
      { type: "simulation_started", time: 0, config: board(), seed: 1 },
      { type: "item_delivered", time: 1, itemId: "W-1", totalLeadTime: 1 },
      { type: "item_delivered", time: 2, itemId: "W-2", totalLeadTime: 2 },
      { type: "item_delivered", time: 3, itemId: "W-3", totalLeadTime: 3 },
      { type: "simulation_ended", time: 20 },
    ];
    const data = fold(throughputProjection, events);
    // 3 delivered, 21 buckets (periodOf(20)=20, indices 0..20) → avg = 3/21 ≈ 0.143
    expect(data.averagePerPeriod).toBeCloseTo(3 / 21, 5);
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

  it("layered cumulative y-values are non-decreasing over time", () => {
    const result = runSimulation(
      cfg({
        board: board({
          stages: [
            stage("s1", { wipLimit: 2, serviceTime: { type: DistributionType.Fixed, params: { value: 1 } } }),
            stage("s2", { wipLimit: 2, serviceTime: { type: DistributionType.Fixed, params: { value: 1 } } }),
          ],
          arrivalRate: { type: DistributionType.Fixed, params: { value: 0.5 } },
          simulationDuration: 20,
        }),
      })
    );
    const data = fold(cfdProjection, result.events);
    const stageOrder = ["s1", "s2"];

    const curves = data.dataPoints.map((p) => {
      const layers: number[] = [p.done];
      for (const stageId of [...stageOrder].reverse()) {
        layers.push(layers[layers.length - 1]! + (p.stages[stageId] ?? 0));
      }
      layers.push(layers[layers.length - 1]! + p.backlog);
      return layers;
    });

    for (let layer = 0; layer < curves[0]!.length; layer++) {
      for (let t = 1; t < curves.length; t++) {
        expect(curves[t]![layer]!).toBeGreaterThanOrEqual(curves[t - 1]![layer]!);
      }
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
  it("tracks in-flight items with ages relative to arrival time", () => {
    const events: SimulationEvent[] = [
      { type: "simulation_started", time: 0, config: board(), seed: 1 },
      {
        type: "item_arrived",
        time: 1,
        itemId: "W-1",
        item: { id: "W-1" } as never,
      },
      { type: "item_pulled", time: 3, itemId: "W-1", stageId: "s1" },
      { type: "work_started", time: 3, itemId: "W-1", stageId: "s1" },
      { type: "work_completed", time: 5, itemId: "W-1", stageId: "s1" },
    ];
    const data = fold(agingWipProjection, events);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.itemId).toBe("W-1");
    // age = 5 - 1 (arrival time), not 5 - 3 (first pull time)
    expect(data.items[0]!.age).toBeCloseTo(4, 10);
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

  it("percentile baselines match leadTimeProjection", () => {
    const simCfg = cfg({
      board: board({
        stages: [
          stage("s1", {
            wipLimit: 2,
            serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
          }),
          stage("s2", {
            wipLimit: 2,
            serviceTime: { type: DistributionType.Fixed, params: { value: 2 } },
          }),
        ],
        arrivalRate: { type: DistributionType.Fixed, params: { value: 0.5 } },
        simulationDuration: 50,
      }),
    });
    const result = runSimulation(simCfg);
    const aging = fold(agingWipProjection, result.events);
    const lt = fold(leadTimeProjection, result.events);
    expect(aging.percentileLines.p50).toBeCloseTo(lt.percentiles.p50, 10);
    expect(aging.percentileLines.p85).toBeCloseTo(lt.percentiles.p85, 10);
    expect(aging.percentileLines.p95).toBeCloseTo(lt.percentiles.p95, 10);
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

  it("counts backlog queue time as wait, not active", () => {
    const data = runAndFold(
      flowEfficiencyProjection,
      cfg({
        board: board({
          stages: [
            stage("s1", {
              wipLimit: 1,
              serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
            }),
          ],
          arrivalRate: { type: DistributionType.Fixed, params: { value: 0.5 } },
          simulationDuration: 20,
        }),
      })
    );
    expect(data.items.length).toBeGreaterThan(2);
    const lastItem = data.items[data.items.length - 1]!;
    expect(lastItem.waitTime).toBeGreaterThan(lastItem.activeTime);
    expect(lastItem.efficiency).toBeLessThan(0.5);
  });

  it("activeTime + waitTime equals lead time for every delivered item", () => {
    const simCfg = cfg({
      board: board({
        stages: [
          stage("s1", {
            wipLimit: 1,
            serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
          }),
          stage("s2", {
            wipLimit: 1,
            serviceTime: { type: DistributionType.Fixed, params: { value: 1 } },
          }),
        ],
        arrivalRate: { type: DistributionType.Fixed, params: { value: 0.7 } },
        simulationDuration: 30,
      }),
    });
    const result = runSimulation(simCfg);
    const fe = fold(flowEfficiencyProjection, result.events);
    const deliveryByItem = new Map(
      result.events
        .filter(
          (e): e is Extract<SimulationEvent, { type: "item_delivered" }> =>
            e.type === "item_delivered",
        )
        .map((e) => [e.itemId, e.totalLeadTime]),
    );
    for (const item of fe.items) {
      const lead = deliveryByItem.get(item.itemId)!;
      expect(item.activeTime + item.waitTime).toBeCloseTo(lead, 9);
    }
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
