import Papa from "papaparse";
import type { SimulationEvent } from "@/engine/types";

export function exportEventsToCsv(events: SimulationEvent[]): string {
  return Papa.unparse(
    events.map((event) => ({
      time: event.time,
      type: event.type,
      itemId: "itemId" in event ? event.itemId : "",
    }))
  );
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
