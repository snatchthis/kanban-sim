import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AdvancedPanel } from "./AdvancedPanel";

interface AdvancedDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AdvancedDrawer({ open, onClose }: AdvancedDrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  return createPortal(
    <div className={`drawer${open ? " drawer--open" : ""}`}>
      <div className="drawer__backdrop" onClick={onClose} />
      <div className="drawer__panel">
        <div className="drawer__header">
          <span className="advanced__title">Advanced Config</span>
          <button
            type="button"
            className="drawer__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="drawer__body">
          <AdvancedPanel />
        </div>
      </div>
    </div>,
    document.body
  );
}
