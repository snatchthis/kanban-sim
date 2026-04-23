import type { StageConfig, DistributionConfig } from "@/engine/types";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { DistInput } from "./DistInput";

interface StageRowProps {
  stage: StageConfig;
  index: number;
  onChange: (next: StageConfig) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  canDelete: boolean;
}

export function StageRow({
  stage,
  index,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  canDelete,
}: StageRowProps) {
  const isUnlimited = stage.wipLimit === null;

  return (
    <div className="stage-row">
      <div className="stage-row__header">
        <input
          type="text"
          className="text-input"
          value={stage.name}
          onChange={(e) => onChange({ ...stage, name: e.target.value })}
        />
        <div className="stage-row__actions">
          <button
            type="button"
            className="icon-btn--sm"
            aria-label={`Move stage ${index} up`}
            disabled={!onMoveUp}
            onClick={onMoveUp}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className="icon-btn--sm"
            aria-label={`Move stage ${index} down`}
            disabled={!onMoveDown}
            onClick={onMoveDown}
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            className="icon-btn--sm"
            aria-label={`Delete stage ${index}`}
            disabled={!canDelete}
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="stage-row__grid">
        <div className="field-row">
          <span className="field-row__label">Workers</span>
          <input
            type="number"
            className="number-input"
            min={1}
            step={1}
            value={stage.workers}
            onChange={(e) => onChange({ ...stage, workers: Number(e.target.value) })}
          />
        </div>

        <div className="field-row">
          <span className="field-row__label">WIP Limit</span>
          <input
            type="number"
            className="number-input"
            min={1}
            step={1}
            disabled={isUnlimited}
            value={isUnlimited ? "" : (stage.wipLimit ?? "")}
            onChange={(e) => onChange({ ...stage, wipLimit: Number(e.target.value) })}
          />
          <label className="toggle">
            <input
              type="checkbox"
              className="checkbox"
              aria-label="Unlimited"
              checked={isUnlimited}
              onChange={(e) =>
                onChange({
                  ...stage,
                  wipLimit: e.target.checked ? null : 3,
                })
              }
            />
            <span className="toggle__label">Unlimited</span>
          </label>
        </div>

        <div className="field-row">
          <span className="field-row__label">Service Time</span>
          <DistInput
            label="Service time"
            value={stage.serviceTime}
            onChange={(serviceTime: DistributionConfig) => onChange({ ...stage, serviceTime })}
            testId={stage.id}
          />
        </div>
      </div>
    </div>
  );
}
