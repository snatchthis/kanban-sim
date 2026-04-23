import { motion } from "framer-motion";
import type { WorkItemView } from "@/projections/item-catalog";
import { ClassOfService, WorkItemType } from "@/engine/types";

const cosClass: Record<ClassOfService, string> = {
  [ClassOfService.Expedite]: "card__tag--expedite",
  [ClassOfService.FixedDate]: "card__tag--fixed-date",
  [ClassOfService.Standard]: "card__tag--standard",
  [ClassOfService.Intangible]: "card__tag--intangible",
};

const typeLabel: Record<WorkItemType, string> = {
  [WorkItemType.Feature]: "FEATURE",
  [WorkItemType.Bug]: "BUG",
  [WorkItemType.TechDebt]: "TECH DEBT",
};

function formatItemId(id: string): string {
  if (/^IDX[-_]/i.test(id)) return id.toUpperCase();
  return `IDX-${id.toUpperCase()}`;
}

function computeProgress(
  workStartedAt: number | null,
  currentTime: number,
  stageMean: number | null,
): number {
  if (workStartedAt === null || stageMean === null || stageMean <= 0) return 0;
  const elapsed = Math.max(0, currentTime - workStartedAt);
  const pct = Math.round((elapsed / stageMean) * 100);
  return Math.min(99, pct);
}

interface WorkItemCardProps {
  item: WorkItemView;
  stageMean: number | null;
  currentTime: number;
  showProgress: boolean;
}

export function WorkItemCard({
  item,
  stageMean,
  currentTime,
  showProgress,
}: WorkItemCardProps) {
  const tagText = typeLabel[item.type] ?? "ROUTINE";
  const tagClass = cosClass[item.classOfService] ?? "";

  const progress = computeProgress(item.workStartedAt, currentTime, stageMean);
  const isWorking = item.workStartedAt !== null;
  const label = item.blocked ? "BLOCKED" : isWorking ? "PROCESSING" : "WAITING";

  return (
    <motion.div
      layout
      layoutId={item.id}
      data-testid={`card-${item.id}`}
      className={`card${item.blocked ? " card--blocked" : ""}`}
    >
      <div className="card__top">
        <span className="card__id">{formatItemId(item.id)}</span>
        <span className={`card__tag ${tagClass}`}>{tagText}</span>
      </div>
      <div className="card__title">{item.title}</div>
      {showProgress && (
        <div className="card__progress">
          <div className="card__progress-meta">
            <span className="card__progress-label">{label}</span>
            <span className="card__progress-value">{progress}%</span>
          </div>
          <div className="card__progress-track">
            <div
              className="card__progress-bar"
              style={{ width: `${isWorking ? progress : 0}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
