import { useEffect, useRef, useState } from "react";
import { FastForward, Play, RotateCcw, Settings } from "lucide-react";
import { useSimulation } from "@/hooks/useSimulation";
import { usePlayback } from "@/hooks/usePlayback";
import { useProjection } from "@/hooks/useProjection";
import { useConfigFromUrl } from "@/hooks/useConfigFromUrl";
import { itemCatalogProjection } from "@/projections";
import { Board } from "@/components/board";
import { ChartsStrip } from "@/components/charts-strip";
import { AdvancedDrawer } from "@/components/advanced";
import { useSimulationStore, hashConfig } from "@/store/simulation-store";
import { useConfigStore } from "@/store/config-store";

type SimStatus = "standby" | "running" | "complete";

export default function App() {
  useConfigFromUrl();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const { result, isRunning, boardState, run, reset } = useSimulation();
  const {
    isPlaying,
    play,
    pause,
    seekToEnd,
    currentEventIndex,
    totalEvents,
  } = usePlayback();

  const catalog = useProjection(itemCatalogProjection);
  const lastRunConfigHash = useSimulationStore((s) => s.lastRunConfigHash);
  const { board, seed } = useConfigStore();

  const hasResult = Boolean(result);
  const isStale =
    hasResult && lastRunConfigHash !== hashConfig({ board, seed });

  const atEnd = hasResult && currentEventIndex >= totalEvents - 1;
  const status: SimStatus = !hasResult
    ? "standby"
    : isPlaying || (hasResult && !atEnd)
      ? "running"
      : "complete";

  const tick = boardState ? Math.floor(boardState.currentTime) : 0;

  const autoPlayRef = useRef(false);
  useEffect(() => {
    if (autoPlayRef.current && result) {
      autoPlayRef.current = false;
      const t = setTimeout(() => play(), 0);
      return () => clearTimeout(t);
    }
  }, [result, play]);

  const initialize = () => {
    if (!hasResult || isStale) {
      autoPlayRef.current = true;
      run();
    } else if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleReset = () => {
    pause();
    reset();
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-controls">
          <button
            type="button"
            className="btn btn--primary"
            onClick={initialize}
            disabled={isRunning}
          >
            <Play size={14} fill="currentColor" />
            {hasResult && !isStale && isPlaying ? "Pause" : "Initialize"}
          </button>
          <button
            type="button"
            className="btn btn--icon"
            onClick={seekToEnd}
            disabled={!hasResult || atEnd}
            aria-label="Fast forward to end"
          >
            <FastForward size={16} />
          </button>
          <button
            type="button"
            className="btn btn--icon"
            onClick={handleReset}
            disabled={!hasResult || isRunning}
            aria-label="Reset"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div className="brand">
          <span className="brand__mark">F</span>
          <div>
            <div className="brand__name">
              FLOW<span className="brand__name-accent">SIM</span>
            </div>
            <span className="brand__sub">sys.mngr.v1</span>
          </div>
        </div>

        <div className="header__spacer" />

        <div className="header__stat">
          <span className="header__stat-label">Tick Time</span>
          <span className="header__stat-value">{tick}</span>
        </div>

        <div className={`header__status header__status--${status}`}>
          <span className="header__status-label">Status</span>
          <span className="header__status-value">{status}</span>
          <span className="header__status-dot" />
        </div>

        <button
          type="button"
          className="btn btn--icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="Advanced configuration"
        >
          <Settings size={16} />
        </button>
      </header>

      <main className="main">
        <section className="board-area" aria-label="Board view">
          {isStale && (
            <div className="stale-banner">
              <span>Config changed — initialize to re-run</span>
            </div>
          )}
          <Board
            boardState={boardState}
            items={catalog.items}
            stageMeans={catalog.stageMeans}
            currentTime={boardState?.currentTime ?? 0}
          />
        </section>

        <ChartsStrip />
      </main>

      <AdvancedDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
