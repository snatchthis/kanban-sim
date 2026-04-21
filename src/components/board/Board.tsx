import type { BoardState } from "@/engine/types";
import type { WorkItemView } from "@/projections/item-catalog";
import { Column } from "./Column";

interface BoardProps {
  boardState: BoardState | null;
  items: Map<string, WorkItemView>;
}

export function Board({ boardState, items }: BoardProps) {
  if (!boardState) return null;

  return (
    <div className="board-grid">
      <Column
        name="Backlog"
        itemIds={boardState.backlog}
        wipLimit={null}
        items={items}
        variant="backlog"
        testId="column-backlog"
      />
      {boardState.stages.map((stage) => (
        <Column
          key={stage.id}
          name={stage.name}
          itemIds={stage.items}
          wipLimit={stage.wipLimit}
          items={items}
          variant="stage"
          testId={`column-${stage.id}`}
        />
      ))}
      <Column
        name="Done"
        itemIds={boardState.done}
        wipLimit={null}
        items={items}
        variant="done"
        testId="column-done"
      />
    </div>
  );
}
