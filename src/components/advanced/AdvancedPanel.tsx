import { useConfigStore } from "@/store/config-store";
import { useSimulationStore } from "@/store/simulation-store";
import { PresetPicker } from "./PresetPicker";
import { SeedField } from "./SeedField";
import { BoardFields } from "./BoardFields";
import { StagesEditor } from "./StagesEditor";
import { CopyLinkButton } from "./CopyLinkButton";

export function AdvancedPanel() {
  const reset = useConfigStore((s) => s.reset);
  const isRunning = useSimulationStore((s) => s.isRunning);

  return (
    <div className="advanced">
      <div className="advanced__section">
        <h3 className="advanced__title">General</h3>
        <PresetPicker />
        <SeedField />
      </div>

      <fieldset disabled={isRunning} className="advanced__body">
        <BoardFields />
        <StagesEditor />
      </fieldset>

      <div className="advanced__footer">
        <CopyLinkButton />
        <button type="button" className="btn btn--ghost" onClick={reset}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
