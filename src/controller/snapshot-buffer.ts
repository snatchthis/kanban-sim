import type { Snapshot } from "@/engine/types";

const DEFAULT_BUFFER_SIZE = 100;

export function createSnapshotBuffer(maxSize: number = DEFAULT_BUFFER_SIZE) {
  const buffer: Snapshot[] = [];

  return {
    push: (snapshot: Snapshot) => {
      buffer.push(snapshot);
      if (buffer.length > maxSize) {
        buffer.shift();
      }
    },
    getNearest: (targetTime: number): Snapshot | null => {
      if (buffer.length === 0) return null;

      let nearest = buffer[0]!;
      for (const snapshot of buffer) {
        if (snapshot.time <= targetTime) {
          nearest = snapshot;
        } else {
          break;
        }
      }
      return nearest;
    },
    getAll: () => [...buffer],
    clear: () => {
      buffer.length = 0;
    },
    size: () => buffer.length,
  };
}
