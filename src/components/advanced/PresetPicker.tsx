import { useConfigStore } from "@/store/config-store";
import { defaultBoard, noWipLimits, bottleneck, highVariability } from "@/utils/presets";
import type { BoardConfig } from "@/engine/types";

const presets: [string, string, BoardConfig][] = [
  ["Default", "default", defaultBoard],
  ["No WIP Limits", "noWipLimits", noWipLimits],
  ["Bottleneck", "bottleneck", bottleneck],
  ["High Variability", "highVariability", highVariability],
];

export function PresetPicker() {
  const setBoard = useConfigStore((s) => s.setBoard);

  return (
    <div className="field-row">
      <span className="field-row__label">Preset</span>
      <select
        className="select"
        aria-label="Preset"
        defaultValue=""
        onChange={(e) => {
          const preset = presets.find(([, key]) => key === e.target.value);
          if (preset) setBoard(preset[2]);
        }}
      >
        <option value="" disabled>
          Select preset...
        </option>
        {presets.map(([label, key]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
