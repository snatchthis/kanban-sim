import { useConfigStore } from "@/store/config-store";
import type { StageConfig } from "@/engine/types";
import { DistributionType } from "@/engine/types";
import { Plus } from "lucide-react";
import { StageRow } from "./StageRow";

const MAX_STAGES = 10;

export function StagesEditor() {
  const board = useConfigStore((s) => s.board);
  const setBoard = useConfigStore((s) => s.setBoard);

  function updateStages(next: StageConfig[]) {
    setBoard({ ...board, stages: next });
  }

  function addStage() {
    if (board.stages.length >= MAX_STAGES) return;
    const newStage: StageConfig = {
      id: `stage-${Date.now()}`,
      name: "New Stage",
      wipLimit: 2,
      workers: 1,
      serviceTime: { type: DistributionType.Exponential, params: { rate: 1 } },
      hasSubColumns: false,
    };
    updateStages([...board.stages, newStage]);
  }

  function updateStage(index: number, next: StageConfig) {
    const stages = [...board.stages];
    stages[index] = next;
    updateStages(stages);
  }

  function moveStage(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= board.stages.length) return;
    const stages = [...board.stages];
    const temp = stages[newIndex]!;
    stages[newIndex] = stages[index]!;
    stages[index] = temp;
    updateStages(stages);
  }

  function deleteStage(index: number) {
    const stages = board.stages.filter((_, i) => i !== index);
    updateStages(stages);
  }

  return (
    <div className="advanced__section">
      <h3 className="advanced__title">Stages</h3>
      {board.stages.map((stage, i) => (
        <StageRow
          key={stage.id}
          stage={stage}
          index={i}
          onChange={(next) => updateStage(i, next)}
          onMoveUp={i > 0 ? () => moveStage(i, -1) : undefined}
          onMoveDown={i < board.stages.length - 1 ? () => moveStage(i, 1) : undefined}
          onDelete={board.stages.length > 1 ? () => deleteStage(i) : undefined}
          canDelete={board.stages.length > 1}
        />
      ))}
      <button
        type="button"
        className="btn btn--ghost"
        disabled={board.stages.length >= MAX_STAGES}
        onClick={addStage}
      >
        <Plus size={14} />
        Add stage
      </button>
    </div>
  );
}
