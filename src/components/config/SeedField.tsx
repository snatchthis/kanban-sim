import { useConfigStore } from "@/store/config-store";

export function SeedField() {
  const seed = useConfigStore((s) => s.seed);
  const setSeed = useConfigStore((s) => s.setSeed);

  return (
    <div className="field field--inline">
      <label className="field__label" htmlFor="seed-input">
        Seed
      </label>
      <input
        id="seed-input"
        type="number"
        min={0}
        step={1}
        aria-label="Seed"
        value={seed}
        onChange={(e) => setSeed(Number(e.target.value))}
      />
      <button
        type="button"
        className="btn btn--ghost"
        aria-label="Randomize seed"
        onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
      >
        🎲
      </button>
    </div>
  );
}
