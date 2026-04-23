import type { StageConfig, DistributionConfig } from "@/engine/types";
import { DistributionField } from "./DistributionField";

interface StageEditorProps {
  stage: StageConfig;
  index: number;
  onChange: (next: StageConfig) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  canDelete: boolean;
}

export function StageEditor({
  stage,
  index,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  canDelete,
}: StageEditorProps) {
  const isUnlimited = stage.wipLimit === null;

  return (
    <div className="stage-card">
      <div className="stage-card__actions">
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          aria-label={`Move stage ${index} up`}
          disabled={!onMoveUp}
          onClick={onMoveUp}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          aria-label={`Move stage ${index} down`}
          disabled={!onMoveDown}
          onClick={onMoveDown}
        >
          ↓
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          aria-label={`Delete stage ${index}`}
          disabled={!canDelete}
          onClick={onDelete}
        >
          ✕
        </button>
      </div>

      <div className="field">
        <label className="field__label">Name</label>
        <input
          type="text"
          value={stage.name}
          onChange={(e) => onChange({ ...stage, name: e.target.value })}
        />
      </div>

      <div className="field field--inline">
        <label className="field__label">WIP Limit</label>
        <input
          type="number"
          min={1}
          step={1}
          disabled={isUnlimited}
          value={isUnlimited ? "" : (stage.wipLimit ?? "")}
          onChange={(e) => onChange({ ...stage, wipLimit: Number(e.target.value) })}
        />
        <label>
          <input
            type="checkbox"
            aria-label="Unlimited"
            checked={isUnlimited}
            onChange={(e) =>
              onChange({
                ...stage,
                wipLimit: e.target.checked ? null : 3,
              })
            }
          />
          Unlimited
        </label>
      </div>

      <div className="field">
        <label className="field__label">Workers</label>
        <input
          type="number"
          min={1}
          step={1}
          value={stage.workers}
          onChange={(e) => onChange({ ...stage, workers: Number(e.target.value) })}
        />
      </div>

      <DistributionField
        label="Service time"
        value={stage.serviceTime}
        onChange={(serviceTime: DistributionConfig) => onChange({ ...stage, serviceTime })}
        testId={stage.id}
      />
    </div>
  );
}
