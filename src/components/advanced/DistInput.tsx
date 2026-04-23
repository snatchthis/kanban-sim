import type { DistributionConfig } from "@/engine/types";
import { DistributionType } from "@/engine/types";

const defaultParamsFor: Record<DistributionType, Record<string, number>> = {
  [DistributionType.Exponential]: { rate: 1 },
  [DistributionType.LogNormal]: { mu: 0, sigma: 1 },
  [DistributionType.Normal]: { mean: 0, stddev: 1 },
  [DistributionType.Uniform]: { min: 0, max: 1 },
  [DistributionType.Fixed]: { value: 1 },
  [DistributionType.Poisson]: { rate: 1 },
};

const paramLabels: Record<DistributionType, string[]> = {
  [DistributionType.Exponential]: ["rate"],
  [DistributionType.LogNormal]: ["mu", "sigma"],
  [DistributionType.Normal]: ["mean", "stddev"],
  [DistributionType.Uniform]: ["min", "max"],
  [DistributionType.Fixed]: ["value"],
  [DistributionType.Poisson]: ["rate"],
};

interface DistInputProps {
  label: string;
  value: DistributionConfig;
  onChange: (next: DistributionConfig) => void;
  testId?: string;
}

export function DistInput({ label, value, onChange, testId }: DistInputProps) {
  const params = paramLabels[value.type] ?? [];

  return (
    <div className="dist-input">
      <select
        className="select"
        data-testid={testId ? `dist-type-${testId}` : undefined}
        value={value.type}
        onChange={(e) => {
          const nextType = e.target.value as DistributionType;
          onChange({
            type: nextType,
            params: { ...defaultParamsFor[nextType] },
          });
        }}
      >
        {Object.values(DistributionType).map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {params.map((key) => (
        <div key={key} className="field-row">
          <span className="field-row__label">{key}</span>
          <input
            type="number"
            step="any"
            className="number-input"
            aria-label={`${label} ${key}`}
            value={value.params[key] ?? 0}
            onChange={(e) =>
              onChange({
                ...value,
                params: { ...value.params, [key]: Number(e.target.value) },
              })
            }
          />
        </div>
      ))}
    </div>
  );
}
