import { AnimatePresence } from "framer-motion";
import type { WorkItemView } from "@/projections/item-catalog";
import { WorkItemCard } from "./WorkItemCard";

type ColumnVariant = "backlog" | "stage" | "done";

interface ColumnProps {
  name: string;
  itemIds: string[];
  wipLimit: number | null;
  items: Map<string, WorkItemView>;
  variant: ColumnVariant;
  testId: string;
}

function wipBadgeClass(count: number, limit: number | null, variant: ColumnVariant): string {
  if (variant !== "stage" || limit === null) return "column__wip";
  if (count > limit) return "column__wip column__wip--danger";
  if (count === limit) return "column__wip column__wip--warning";
  return "column__wip";
}

function wipLabel(count: number, limit: number | null, variant: ColumnVariant): string {
  if (variant !== "stage" || limit === null) return String(count);
  return `${count}/${limit}`;
}

export function Column({ name, itemIds, wipLimit, items, variant, testId }: ColumnProps) {
  const count = itemIds.length;
  return (
    <div className="column" data-testid={testId}>
      <div className="column__header">
        <span className="column__name">{name}</span>
        <span className={wipBadgeClass(count, wipLimit, variant)}>
          {wipLabel(count, wipLimit, variant)}
        </span>
      </div>
      <div className="column__body">
        <AnimatePresence>
          {itemIds.map((id) => {
            const item = items.get(id);
            if (!item) return null;
            return <WorkItemCard key={item.id} item={item} />;
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
