import { useSimulation } from "@/hooks/useSimulation";
import { usePlayback } from "@/hooks/usePlayback";

export default function App() {
  const { result, isRunning, run, reset } = useSimulation();
  const { stepForward, stepBackward, seekToStart, seekToEnd, currentEventIndex, totalEvents } =
    usePlayback();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "1rem",
        gap: "1rem",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          Kanban Simulator
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={run}
            disabled={isRunning}
            style={{
              padding: "0.5rem 1rem",
              background: "var(--color-primary)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-md)",
            }}
          >
            Run Simulation
          </button>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Reset
          </button>
        </div>
      </header>

      {result && (
        <>
          <div
            style={{
              flex: 1,
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary)",
            }}
          >
            Board View — {result.events.length} events generated
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.5rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          >
            <button onClick={seekToStart}>|&lt;</button>
            <button onClick={stepBackward}>&lt;</button>
            <span style={{ fontVariantNumeric: "tabular-nums", minWidth: "8rem", textAlign: "center" }}>
              Event {currentEventIndex + 1} / {totalEvents}
            </span>
            <button onClick={stepForward}>&gt;</button>
            <button onClick={seekToEnd}>&gt;|</button>
          </div>
        </>
      )}

      {!result && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-secondary)",
          }}
        >
          Configure a board and click "Run Simulation" to begin.
        </div>
      )}
    </div>
  );
}
