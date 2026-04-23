import { useState } from "react";
import { useConfigStore } from "@/store/config-store";
import { useSimulationStore } from "@/store/simulation-store";
import { configToUrl } from "@/utils/url-state";
import { PresetSelect } from "./PresetSelect";
import { SeedField } from "./SeedField";
import { BoardFields } from "./BoardFields";
import { StagesEditor } from "./StagesEditor";

export function ConfigPanel() {
  const { board, seed, reset } = useConfigStore();
  const isRunning = useSimulationStore((s) => s.isRunning);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = configToUrl(board, seed);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="panel config">
      <header className="config__header">
        <PresetSelect />
        <SeedField />
        <button type="button" className="btn" onClick={copyLink}>
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={reset}>
          Reset to defaults
        </button>
      </header>

      <fieldset disabled={isRunning} className="config__body">
        <BoardFields />
        <StagesEditor />
      </fieldset>
    </section>
  );
}
