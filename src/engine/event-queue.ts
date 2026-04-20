import type { SimulationEvent } from "./types";

interface PriorityQueueEntry {
  time: number;
  event: SimulationEvent;
}

export function createEventQueue(): {
  push: (time: number, event: SimulationEvent) => void;
  pop: () => PriorityQueueEntry | null;
  peek: () => PriorityQueueEntry | null;
  size: () => number;
  isEmpty: () => boolean;
  clear: () => void;
} {
  const heap: PriorityQueueEntry[] = [];

  return {
    push: (time, event) => {
      heap.push({ time, event });
      bubbleUp(heap, heap.length - 1);
    },
    pop: () => {
      if (heap.length === 0) return null;
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        sinkDown(heap, 0);
      }
      return top;
    },
    peek: () => (heap.length > 0 ? heap[0]! : null),
    size: () => heap.length,
    isEmpty: () => heap.length === 0,
    clear: () => {
      heap.length = 0;
    },
  };
}

function bubbleUp(heap: PriorityQueueEntry[], index: number): void {
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent]!.time <= heap[index]!.time) break;
    [heap[parent], heap[index]] = [heap[index]!, heap[parent]!];
    index = parent;
  }
}

function sinkDown(heap: PriorityQueueEntry[], index: number): void {
  const length = heap.length;
  while (true) {
    let smallest = index;
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    if (left < length && heap[left]!.time < heap[smallest]!.time) smallest = left;
    if (right < length && heap[right]!.time < heap[smallest]!.time) smallest = right;
    if (smallest === index) break;
    [heap[smallest], heap[index]] = [heap[index]!, heap[smallest]!];
    index = smallest;
  }
}
