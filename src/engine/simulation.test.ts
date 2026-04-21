import { describe, it, expect } from "vitest";
import { runSimulation } from "./simulation";
import type { BoardConfig, SimulationConfig, StageConfig } from "./types";
import { DistributionType, PullPolicyType, WipPolicyType } from "./types";

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

function config(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return { board: board(), seed: 1, ...overrides };
}

describe("runSimulation", () => {
  describe("lifecycle sentinels", () => {
    it("emits simulation_started first and simulation_ended last", () => {
      const result = runSimulation(config());
      expect(result.events[0]?.type).toBe("simulation_started");
      expect(result.events[result.events.length - 1]?.type).toBe("simulation_ended");
    });

    it("simulation_ended.time does not exceed simulationDuration", () => {
      const result = runSimulation(config({ board: board({ simulationDuration: 10 }) }));
      const last = result.events[result.events.length - 1];
      if (last?.type !== "simulation_ended") throw new Error("expected simulation_ended");
      expect(last.time).toBeLessThanOrEqual(10);
    });

    it("no processed event has time beyond simulationDuration", () => {
      const result = runSimulation(
        config({
          board: board({
            arrivalRate: { type: DistributionType.Exponential, params: { rate: 2 } },
            stages: [stage("s1", { serviceTime: { type: DistributionType.Exponential, params: { rate: 1 } } })],
            simulationDuration: 15,
          }),
          seed: 7,
        })
      );
      for (const e of result.events) {
        expect(e.time).toBeLessThanOrEqual(15);
      }
    });
  });

  describe("determinism", () => {
    it("same config and seed produce deep-equal event streams", () => {
      const cfg = config({
        board: board({
          arrivalRate: { type: DistributionType.Exponential, params: { rate: 1 } },
          stages: [
            stage("s1", { serviceTime: { type: DistributionType.Exponential, params: { rate: 2 } } }),
          ],
          simulationDuration: 25,
        }),
        seed: 123,
      });
      const a = runSimulation(cfg);
      const b = runSimulation(cfg);
      expect(a.events).toEqual(b.events);
    });

    it("different seeds produce different event streams", () => {
      const baseCfg = config({
        board: board({
          arrivalRate: { type: DistributionType.Exponential, params: { rate: 1 } },
          stages: [
            stage("s1", { serviceTime: { type: DistributionType.Exponential, params: { rate: 2 } } }),
          ],
          simulationDuration: 25,
        }),
        seed: 1,
      });
      const a = runSimulation(baseCfg);
      const b = runSimulation({ ...baseCfg, seed: 9999 });
      expect(a.events).not.toEqual(b.events);
    });
  });

  describe("single-stage fixed timing", () => {
    it("delivers the expected number of items", () => {
      // arrivals at t=1,2,...,10 (10 items), service=0.5 each, unlimited WIP
      // completions at 1.5,2.5,...,10.5 — 10.5 > 10 is cut, so 9 deliveries
      const result = runSimulation(
        config({
          board: board({
            arrivalRate: { type: DistributionType.Fixed, params: { value: 1 } },
            stages: [
              stage("s1", {
                serviceTime: { type: DistributionType.Fixed, params: { value: 0.5 } },
                wipLimit: 100,
              }),
            ],
            simulationDuration: 10,
          }),
        })
      );
      const arrivals = result.events.filter((e) => e.type === "item_arrived");
      const deliveries = result.events.filter((e) => e.type === "item_delivered");
      expect(arrivals).toHaveLength(10);
      expect(deliveries).toHaveLength(9);
    });

    it("item_delivered.totalLeadTime equals service time for unblocked flow", () => {
      const result = runSimulation(
        config({
          board: board({
            arrivalRate: { type: DistributionType.Fixed, params: { value: 2 } },
            stages: [
              stage("s1", {
                serviceTime: { type: DistributionType.Fixed, params: { value: 0.5 } },
                wipLimit: 100,
              }),
            ],
            simulationDuration: 20,
          }),
        })
      );
      for (const ev of result.events) {
        if (ev.type === "item_delivered") {
          expect(ev.totalLeadTime).toBeCloseTo(0.5, 10);
        }
      }
    });
  });

  describe("wip enforcement (strict)", () => {
    it("stage WIP never exceeds the configured limit", () => {
      const result = runSimulation(
        config({
          board: board({
            arrivalRate: { type: DistributionType.Fixed, params: { value: 0.5 } },
            stages: [
              stage("s1", {
                serviceTime: { type: DistributionType.Fixed, params: { value: 2 } },
                wipLimit: 1,
              }),
            ],
            simulationDuration: 20,
            wipPolicy: WipPolicyType.Strict,
          }),
        })
      );
      const wipEvents = result.events.filter((e) => e.type === "stage_wip_changed");
      expect(wipEvents.length).toBeGreaterThan(0);
      for (const ev of wipEvents) {
        if (ev.type === "stage_wip_changed") {
          expect(ev.wip).toBeLessThanOrEqual(1);
        }
      }
    });

    it("backlog grows when arrivals outpace capacity", () => {
      const result = runSimulation(
        config({
          board: board({
            arrivalRate: { type: DistributionType.Fixed, params: { value: 0.5 } },
            stages: [
              stage("s1", {
                serviceTime: { type: DistributionType.Fixed, params: { value: 2 } },
                wipLimit: 1,
              }),
            ],
            simulationDuration: 20,
          }),
        })
      );
      // more arrivals than deliveries → backlog must have items at end
      const arrivals = result.events.filter((e) => e.type === "item_arrived").length;
      const deliveries = result.events.filter((e) => e.type === "item_delivered").length;
      expect(arrivals).toBeGreaterThan(deliveries);
      expect(result.finalState.backlog.length + result.finalState.stages[0]!.items.length).toBe(
        arrivals - deliveries
      );
    });
  });

  describe("multi-stage chain", () => {
    it("items traverse stages in declared order", () => {
      const result = runSimulation(
        config({
          board: board({
            stages: [
              stage("s1", { serviceTime: { type: DistributionType.Fixed, params: { value: 1 } } }),
              stage("s2", { serviceTime: { type: DistributionType.Fixed, params: { value: 1 } } }),
              stage("s3", { serviceTime: { type: DistributionType.Fixed, params: { value: 1 } } }),
            ],
            arrivalRate: { type: DistributionType.Fixed, params: { value: 5 } },
            simulationDuration: 20,
          }),
        })
      );
      const delivered = result.events.filter((e) => e.type === "item_delivered");
      expect(delivered.length).toBeGreaterThan(0);

      // reconstruct pulled-stages per item from events
      const itemStages = new Map<string, string[]>();
      for (const ev of result.events) {
        if (ev.type === "item_pulled") {
          const list = itemStages.get(ev.itemId) ?? [];
          list.push(ev.stageId);
          itemStages.set(ev.itemId, list);
        }
      }
      // every delivered item visited s1, s2, s3 in order
      for (const ev of delivered) {
        if (ev.type === "item_delivered") {
          const stages = itemStages.get(ev.itemId) ?? [];
          expect(stages).toEqual(["s1", "s2", "s3"]);
        }
      }
    });
  });

  describe("item id scoping", () => {
    it("two sequential runs both start ids from W-1", () => {
      const cfg = config();
      const a = runSimulation(cfg);
      const b = runSimulation(cfg);
      const firstA = a.events.find((e) => e.type === "item_arrived");
      const firstB = b.events.find((e) => e.type === "item_arrived");
      if (firstA?.type !== "item_arrived" || firstB?.type !== "item_arrived") {
        throw new Error("expected item_arrived events");
      }
      expect(firstA.itemId).toBe("W-1");
      expect(firstB.itemId).toBe("W-1");
    });
  });
});
