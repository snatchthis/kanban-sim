import { motion } from "framer-motion";
import type { WorkItemView } from "@/projections/item-catalog";
import { ClassOfService } from "@/engine/types";

const cosVar: Record<ClassOfService, string> = {
  [ClassOfService.Expedite]: "var(--cos-expedite)",
  [ClassOfService.FixedDate]: "var(--cos-fixed-date)",
  [ClassOfService.Standard]: "var(--cos-standard)",
  [ClassOfService.Intangible]: "var(--cos-intangible)",
};

export function WorkItemCard({ item }: { item: WorkItemView }) {
  return (
    <motion.div
      layout
      layoutId={item.id}
      data-testid={`card-${item.id}`}
      className={`card${item.blocked ? " card--blocked" : ""}`}
    >
      <div
        className="card__cos-band"
        style={{ background: cosVar[item.classOfService] }}
      />
      <span className="card__id">{item.id}</span>
    </motion.div>
  );
}
