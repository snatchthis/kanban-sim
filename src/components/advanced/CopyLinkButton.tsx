import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useConfigStore } from "@/store/config-store";
import { configToUrl } from "@/utils/url-state";

export function CopyLinkButton() {
  const { board, seed } = useConfigStore();
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = configToUrl(board, seed);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button type="button" className="btn btn--ghost" onClick={copyLink}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
