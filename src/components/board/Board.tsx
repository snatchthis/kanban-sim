import type { BoardState } from "@/engine/types";
import type { WorkItemView } from "@/projections/item-catalog";
import { Column } from "./Column";

interface BoardProps {
  boardState: BoardState | null;
  items: Map<string, WorkItemView>;
  stageMeans: Record<string, number>;
  currentTime: number;
}

export function Board({ boardState, items, stageMeans, currentTime }: BoardProps) {
  if (!boardState) return null;

  return (
    <div className="board-grid">
      <Column
        name="Backlog"
        itemIds={boardState.backlog}
        wipLimit={null}
        items={items}
        stageMean={null}
        currentTime={currentTime}
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
          stageMean={stageMeans[stage.id] ?? null}
          currentTime={currentTime}
          variant="stage"
          testId={`column-${stage.id}`}
        />
      ))}
      <Column
        name="Done"
        itemIds={boardState.done}
        wipLimit={null}
        items={items}
        stageMean={null}
        currentTime={currentTime}
        variant="done"
        testId="column-done"
      />
    </div>
  );
}
