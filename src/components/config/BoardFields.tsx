import { useConfigStore } from "@/store/config-store";
import { PullPolicyType, WipPolicyType } from "@/engine/types";
import type { DistributionConfig } from "@/engine/types";
import { DistributionField } from "./DistributionField";

export function BoardFields() {
  const board = useConfigStore((s) => s.board);
  const setBoard = useConfigStore((s) => s.setBoard);

  function update(partial: Partial<typeof board>) {
    setBoard({ ...board, ...partial });
  }

  return (
    <div className="board-fields">
      <DistributionField
        label="Arrival rate"
        value={board.arrivalRate}
        onChange={(arrivalRate: DistributionConfig) => update({ arrivalRate })}
        testId="arrival"
      />

      <div className="field">
        <label className="field__label" htmlFor="pull-policy">
          Pull policy
        </label>
        <select
          id="pull-policy"
          value={board.pullPolicy}
          onChange={(e) => update({ pullPolicy: e.target.value as PullPolicyType })}
        >
          {Object.values(PullPolicyType).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="wip-policy">
          WIP policy
        </label>
        <select
          id="wip-policy"
          value={board.wipPolicy}
          onChange={(e) => update({ wipPolicy: e.target.value as WipPolicyType })}
        >
          {Object.values(WipPolicyType).map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="batch-size">
          Batch size
        </label>
        <input
          id="batch-size"
          type="number"
          min={1}
          step={1}
          value={board.batchSize}
          onChange={(e) => update({ batchSize: Number(e.target.value) })}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="duration">
          Duration
        </label>
        <input
          id="duration"
          type="number"
          min={1}
          value={board.simulationDuration}
          onChange={(e) => update({ simulationDuration: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
