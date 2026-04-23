import { useConfigStore } from "@/store/config-store";
import { Shuffle } from "lucide-react";

export function SeedField() {
  const seed = useConfigStore((s) => s.seed);
  const setSeed = useConfigStore((s) => s.setSeed);

  return (
    <div className="field-row">
      <span className="field-row__label">Seed</span>
      <input
        type="number"
        className="number-input"
        min={0}
        step={1}
        aria-label="Seed"
        value={seed}
        onChange={(e) => setSeed(Number(e.target.value))}
      />
      <button
        type="button"
        className="icon-btn--sm"
        aria-label="Randomize seed"
        onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
      >
        <Shuffle size={14} />
      </button>
    </div>
  );
}
