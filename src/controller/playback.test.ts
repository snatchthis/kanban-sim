import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SimulationEvent } from "@/engine/types";

function makeEvents(times: number[]): SimulationEvent[] {
  return times.map(
    (t, i) =>
      ({
        type: i === 0 ? "simulation_started" : "simulation_ended",
        time: t,
        ...(i === 0
          ? {
              config: {
                stages: [],
                arrivalRate: { type: "fixed", params: { value: 1 } },
                pullPolicy: "fifo",
                wipPolicy: "strict",
                batchSize: 1,
                simulationDuration: 100,
              },
              seed: 1,
            }
          : {}),
      }) as SimulationEvent,
  );
}

function createManualTickOptions(events: SimulationEvent[]) {
  let tickCallback: (() => void) | null = null;
  const scheduleTick = vi.fn((fn: () => void) => {
    tickCallback = fn;
    return () => {
      tickCallback = null;
    };
  });
  let nowValue = 0;

  return {
    options: {
      events,
      tickMs: 16,
      now: () => nowValue,
      scheduleTick,
    },
    advanceNow: (ms: number) => {
      nowValue += ms;
    },
    fireTick: () => {
      if (tickCallback) tickCallback();
    },
    getScheduleTickCalls: () => scheduleTick.mock.calls.length,
  };
}

describe("PlaybackController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initial state reflects options", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02, 0.03]);
    const ctrl = createPlaybackController({ events, initialIndex: 2, initialSpeed: 5 });
    const state = ctrl.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.speed).toBe(5);
    expect(state.currentEventIndex).toBe(2);
    ctrl.dispose();
  });

  it("defaults to index 0 and speed 1", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const ctrl = createPlaybackController({ events });
    const state = ctrl.getState();
    expect(state.currentEventIndex).toBe(0);
    expect(state.speed).toBe(1);
    ctrl.dispose();
  });

  it("play() sets isPlaying to true and schedules ticks", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const harness = createManualTickOptions(events);
    const ctrl = createPlaybackController(harness.options);
    ctrl.play();
    expect(ctrl.getState().isPlaying).toBe(true);
    expect(harness.getScheduleTickCalls()).toBe(1);
    ctrl.dispose();
  });

  it("advances event index based on sim time progression at speed 1", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.016, 0.032, 0.048]);
    const harness = createManualTickOptions(events);
    const ctrl = createPlaybackController(harness.options);
    ctrl.play();

    harness.advanceNow(16);
    harness.fireTick();
    expect(ctrl.getState().currentEventIndex).toBe(1);

    harness.advanceNow(16);
    harness.fireTick();
    expect(ctrl.getState().currentEventIndex).toBe(2);

    ctrl.dispose();
  });

  it("speed 10 advances faster", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02, 0.03]);
    const harness = createManualTickOptions(events);
    const ctrl = createPlaybackController(harness.options);
    ctrl.play();
    ctrl.setSpeed(10);

    harness.advanceNow(16);
    harness.fireTick();
    expect(ctrl.getState().currentEventIndex).toBeGreaterThanOrEqual(2);

    ctrl.dispose();
  });

  it("pause() stops index movement", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02, 0.03]);
    const harness = createManualTickOptions(events);
    const ctrl = createPlaybackController(harness.options);
    ctrl.play();

    harness.advanceNow(16);
    harness.fireTick();
    const pausedAt = ctrl.getState().currentEventIndex;

    ctrl.pause();
    expect(ctrl.getState().isPlaying).toBe(false);

    harness.advanceNow(100);
    harness.fireTick();
    expect(ctrl.getState().currentEventIndex).toBe(pausedAt);

    ctrl.dispose();
  });

  it("play() resumes from paused index", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02, 0.03, 0.04]);
    const harness = createManualTickOptions(events);
    const ctrl = createPlaybackController(harness.options);
    ctrl.play();

    harness.advanceNow(16);
    harness.fireTick();
    ctrl.pause();
    const pausedIndex = ctrl.getState().currentEventIndex;

    ctrl.play();
    harness.advanceNow(32);
    harness.fireTick();
    expect(ctrl.getState().currentEventIndex).toBeGreaterThan(pausedIndex);

    ctrl.dispose();
  });

  it("auto-pauses at last event", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const harness = createManualTickOptions(events);
    const ctrl = createPlaybackController(harness.options);
    const states: ReturnType<typeof ctrl.getState>[] = [];
    ctrl.subscribe((s) => states.push({ ...s }));

    ctrl.play();
    harness.advanceNow(100);
    harness.fireTick();

    expect(ctrl.getState().isPlaying).toBe(false);
    expect(ctrl.getState().currentEventIndex).toBe(events.length - 1);
    expect(states.some((s) => !s.isPlaying)).toBe(true);

    ctrl.dispose();
  });

  it("step() pauses and advances by 1", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02, 0.03]);
    const ctrl = createPlaybackController({ events });
    ctrl.play();
    ctrl.step();
    expect(ctrl.getState().isPlaying).toBe(false);
    expect(ctrl.getState().currentEventIndex).toBe(1);
    ctrl.dispose();
  });

  it("step() clamps at last event", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01]);
    const ctrl = createPlaybackController({ events });
    ctrl.step();
    ctrl.step();
    ctrl.step();
    expect(ctrl.getState().currentEventIndex).toBe(events.length - 1);
    ctrl.dispose();
  });

  it("stepBackward() pauses and decrements by 1", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const ctrl = createPlaybackController({ events, initialIndex: 2 });
    ctrl.play();
    ctrl.stepBackward();
    expect(ctrl.getState().isPlaying).toBe(false);
    expect(ctrl.getState().currentEventIndex).toBe(1);
    ctrl.dispose();
  });

  it("stepBackward() clamps at 0", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01]);
    const ctrl = createPlaybackController({ events });
    ctrl.stepBackward();
    expect(ctrl.getState().currentEventIndex).toBe(0);
    ctrl.dispose();
  });

  it("seekTo(i) clamps and preserves isPlaying", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02, 0.03]);
    const ctrl = createPlaybackController({ events });
    ctrl.play();
    ctrl.seekTo(2);
    expect(ctrl.getState().currentEventIndex).toBe(2);
    expect(ctrl.getState().isPlaying).toBe(true);

    ctrl.seekTo(-5);
    expect(ctrl.getState().currentEventIndex).toBe(0);

    ctrl.seekTo(999);
    expect(ctrl.getState().currentEventIndex).toBe(events.length - 1);

    ctrl.dispose();
  });

  it("setSpeed() updates speed without changing index", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const ctrl = createPlaybackController({ events, initialIndex: 1 });
    ctrl.setSpeed(10);
    expect(ctrl.getState().speed).toBe(10);
    expect(ctrl.getState().currentEventIndex).toBe(1);
    ctrl.dispose();
  });

  it("reset() returns to paused at index 0, speed unchanged", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const ctrl = createPlaybackController({ events, initialSpeed: 5 });
    ctrl.play();
    ctrl.step();
    ctrl.reset();
    expect(ctrl.getState().isPlaying).toBe(false);
    expect(ctrl.getState().currentEventIndex).toBe(0);
    expect(ctrl.getState().speed).toBe(5);
    ctrl.dispose();
  });

  it("subscribe fires on state changes", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const ctrl = createPlaybackController({ events });
    const states: ReturnType<typeof ctrl.getState>[] = [];
    ctrl.subscribe((s) => states.push({ ...s }));

    ctrl.play();
    expect(states).toHaveLength(1);
    expect(states[0]!.isPlaying).toBe(true);

    ctrl.pause();
    expect(states).toHaveLength(2);
    expect(states[1]!.isPlaying).toBe(false);

    ctrl.dispose();
  });

  it("subscribe does not fire on no-ops", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const ctrl = createPlaybackController({ events });
    const states: ReturnType<typeof ctrl.getState>[] = [];
    ctrl.subscribe((s) => states.push({ ...s }));

    ctrl.pause();
    ctrl.pause();
    expect(states).toHaveLength(0);

    ctrl.dispose();
  });

  it("unsubscribe stops notifications", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const ctrl = createPlaybackController({ events });
    const states: ReturnType<typeof ctrl.getState>[] = [];
    const unsub = ctrl.subscribe((s) => states.push({ ...s }));

    unsub();
    ctrl.play();
    expect(states).toHaveLength(0);

    ctrl.dispose();
  });

  it("dispose cancels pending ticks and clears listeners", async () => {
    const { createPlaybackController } = await import("./playback");
    const events = makeEvents([0, 0.01, 0.02]);
    const ctrl = createPlaybackController({ events });
    const states: ReturnType<typeof ctrl.getState>[] = [];
    ctrl.subscribe((s) => states.push({ ...s }));

    ctrl.play();
    ctrl.dispose();

    ctrl.play();
    expect(states).toHaveLength(1);
  });
});
