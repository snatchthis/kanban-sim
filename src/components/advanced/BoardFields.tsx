import { useConfigStore } from "@/store/config-store";
import { WipPolicyType } from "@/engine/types";
import type { DistributionConfig } from "@/engine/types";
import { DistInput } from "./DistInput";

export function BoardFields() {
  const board = useConfigStore((s) => s.board);
  const setBoard = useConfigStore((s) => s.setBoard);

  function update(partial: Partial<typeof board>) {
    setBoard({ ...board, ...partial });
  }

  return (
    <div className="advanced__section">
      <h3 className="advanced__title">Board</h3>

      <div className="field-row">
        <span className="field-row__label">Arrival Rate</span>
        <DistInput
          label="Arrival rate"
          value={board.arrivalRate}
          onChange={(arrivalRate: DistributionConfig) => update({ arrivalRate })}
          testId="arrival"
        />
      </div>

      <div className="field-row">
        <span className="field-row__label">WIP Policy</span>
        <select
          className="select"
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

      <div className="field-row">
        <span className="field-row__label">Batch Size</span>
        <input
          type="number"
          className="number-input"
          min={1}
          step={1}
          value={board.batchSize}
          onChange={(e) => update({ batchSize: Number(e.target.value) })}
        />
      </div>

      <div className="field-row">
        <span className="field-row__label">Duration</span>
        <input
          type="number"
          className="number-input"
          min={1}
          value={board.simulationDuration}
          onChange={(e) => update({ simulationDuration: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
