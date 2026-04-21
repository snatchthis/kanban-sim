import {
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useSimulation } from "@/hooks/useSimulation";
import { usePlayback } from "@/hooks/usePlayback";
import { useProjection } from "@/hooks/useProjection";
import { itemCatalogProjection } from "@/projections";
import { Board } from "@/components/board";
import { ChartPanel } from "@/components/charts";
import { useUiStore } from "@/store/ui-store";

export default function App() {
  const { result, isRunning, boardState, run, reset } = useSimulation();
  const {
    stepForward,
    stepBackward,
    seekToStart,
    seekToEnd,
    currentEventIndex,
    totalEvents,
  } = usePlayback();

  const items = useProjection(itemCatalogProjection);
  const { activeTab, setActiveTab } = useUiStore();

  const hasResult = Boolean(result);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__brand-mark" aria-hidden>
            K
          </span>
          Kanban Simulator
          <span className="app__brand-sub">flow · wip · cfd</span>
        </div>

        <div className="app__toolbar">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={reset}
            disabled={!hasResult || isRunning}
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={run}
            disabled={isRunning}
          >
            <Play size={14} />
            {isRunning ? "Running…" : "Run simulation"}
          </button>
        </div>
      </header>

      <main className="app__main">
        {hasResult ? (
          <>
            <section className="panel stat-strip" aria-label="Run summary">
              <Metric label="Events" value={result!.events.length.toLocaleString()} />
              <Metric label="Snapshots" value={result!.snapshots.length.toLocaleString()} />
              <Metric
                label="Position"
                value={`${currentEventIndex + 1} / ${totalEvents}`}
              />
              <Metric label="Seed" value={<span className="mono">—</span>} />
            </section>

            <nav className="tab-bar" role="tablist" aria-label="View switcher">
              <button
                type="button"
                className={`tab-bar__tab${activeTab === "board" ? " tab-bar__tab--active" : ""}`}
                role="tab"
                aria-selected={activeTab === "board"}
                onClick={() => setActiveTab("board")}
              >
                Board
              </button>
              <button
                type="button"
                className={`tab-bar__tab${activeTab === "charts" ? " tab-bar__tab--active" : ""}`}
                role="tab"
                aria-selected={activeTab === "charts"}
                onClick={() => setActiveTab("charts")}
              >
                Charts
              </button>
            </nav>

            {activeTab === "board" ? (
              <section className="panel board" aria-label="Board view">
                <Board boardState={boardState} items={items} />
              </section>
            ) : (
              <ChartPanel />
            )}
          </>
        ) : (
          <section className="panel">
            <div className="empty">
              <div className="empty__title">No simulation yet</div>
              <p className="empty__hint">
                Configure a board and press{" "}
                <kbd className="pill mono">Run simulation</kbd> to generate a
                deterministic event stream. Same config + seed always produces
                the same run.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="app__footer">
        <div className="transport" role="group" aria-label="Playback controls">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={seekToStart}
            disabled={!hasResult || currentEventIndex === 0}
            aria-label="Seek to start"
          >
            <SkipBack size={14} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={stepBackward}
            disabled={!hasResult || currentEventIndex === 0}
            aria-label="Step back"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="transport__readout" aria-live="polite">
            {hasResult
              ? `${String(currentEventIndex + 1).padStart(String(totalEvents).length, "0")} / ${totalEvents}`
              : "— / —"}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={stepForward}
            disabled={!hasResult || currentEventIndex >= totalEvents - 1}
            aria-label="Step forward"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={seekToEnd}
            disabled={!hasResult || currentEventIndex >= totalEvents - 1}
            aria-label="Seek to end"
          >
            <SkipForward size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value" data-metric>
        {value}
      </span>
    </div>
  );
}
