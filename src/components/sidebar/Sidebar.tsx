import { useConfigStore } from "@/store/config-store";
import { PullPolicyType, DistributionType } from "@/engine/types";
import type { StageConfig } from "@/engine/types";

const DEV_STAGE_ID = "in_progress";
const QA_STAGE_ID = "review";

const PULL_POLICIES: Array<{ value: PullPolicyType; label: string }> = [
  { value: PullPolicyType.FIFO, label: "FIFO (Standard)" },
  { value: PullPolicyType.ShortestFirst, label: "Shortest First" },
  { value: PullPolicyType.CostOfDelay, label: "Cost of Delay" },
  { value: PullPolicyType.Priority, label: "Priority (Class of Service)" },
];

function getArrivalPercent(rate: number): number {
  return Math.round(rate * 100);
}

export function Sidebar() {
  const board = useConfigStore((s) => s.board);
  const setArrivalRate = useConfigStore((s) => s.setArrivalRate);
  const setStageWorkers = useConfigStore((s) => s.setStageWorkers);
  const setStageWipLimit = useConfigStore((s) => s.setStageWipLimit);
  const setPullPolicy = useConfigStore((s) => s.setPullPolicy);

  const arrivalRate = board.arrivalRate.params["rate"] ?? 0.3;
  const isCustomArrival = board.arrivalRate.type !== DistributionType.Exponential;
  const devStage = board.stages.find((s) => s.id === DEV_STAGE_ID);
  const qaStage = board.stages.find((s) => s.id === QA_STAGE_ID);

  return (
    <aside className="sidebar" aria-label="Simulation controls">
      <section className="sidebar__section">
        <h2 className="sidebar__title">Environment</h2>

        <SliderControl
          label="Incoming Flow"
          value={getArrivalPercent(arrivalRate)}
          display={isCustomArrival ? "custom" : `${getArrivalPercent(arrivalRate)}%`}
          min={0}
          max={100}
          step={5}
          onChange={(v) => setArrivalRate(v / 100)}
          disabled={isCustomArrival}
        />

        {devStage && (
          <SliderControl
            label="Dev Units"
            value={devStage.workers}
            display={String(devStage.workers)}
            min={1}
            max={8}
            step={1}
            onChange={(v) => setStageWorkers(DEV_STAGE_ID, v)}
          />
        )}

        {qaStage && (
          <SliderControl
            label="Q/A Units"
            value={qaStage.workers}
            display={String(qaStage.workers)}
            min={1}
            max={8}
            step={1}
            onChange={(v) => setStageWorkers(QA_STAGE_ID, v)}
          />
        )}
      </section>

      <section className="sidebar__section">
        <h2 className="sidebar__title">Load Limits (WIP)</h2>
        {board.stages.map((stage) => (
          <WipRow
            key={stage.id}
            stage={stage}
            onToggle={(enabled) =>
              setStageWipLimit(stage.id, enabled ? stage.wipLimit ?? 3 : null)
            }
            onChange={(v) => setStageWipLimit(stage.id, v)}
          />
        ))}
      </section>

      <section className="sidebar__section">
        <h2 className="sidebar__title">Core Directives</h2>
        <div className="control">
          <div className="control__header">
            <span className="control__label">Priority Routing</span>
          </div>
          <select
            className="select"
            value={board.pullPolicy}
            onChange={(e) => setPullPolicy(e.target.value as PullPolicyType)}
          >
            {PULL_POLICIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </section>
    </aside>
  );
}

interface SliderProps {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function SliderControl({ label, value, display, min, max, step, onChange, disabled }: SliderProps) {
  return (
    <div className="control">
      <div className="control__header">
        <span className="control__label">{label}</span>
        <span className="control__value">{display}</span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

interface WipRowProps {
  stage: StageConfig;
  onToggle: (enabled: boolean) => void;
  onChange: (v: number) => void;
}

function WipRow({ stage, onToggle, onChange }: WipRowProps) {
  const enabled = stage.wipLimit !== null;
  return (
    <div className="wip-row">
      <span className={`wip-row__label${enabled ? "" : " wip-row__label--disabled"}`}>
        {stage.name}
      </span>
      <input
        type="checkbox"
        className="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`Enable WIP limit for ${stage.name}`}
      />
      <input
        type="number"
        className="wip-row__number"
        value={stage.wipLimit ?? ""}
        min={0}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= 0) onChange(v);
        }}
        disabled={!enabled}
        aria-label={`WIP limit for ${stage.name}`}
      />
    </div>
  );
}
