import type { BoardConfig, BoardState, StageState } from "./types";

export function createInitialState(config: BoardConfig): BoardState {
  const stages: StageState[] = config.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    items: [],
    wipLimit: stage.wipLimit,
    workers: stage.workers,
  }));

  return {
    stages,
    backlog: [],
    done: [],
    currentTime: 0,
  };
}

export function addItemToStage(
  state: BoardState,
  itemId: string,
  stageId: string
): BoardState {
  return {
    ...state,
    stages: state.stages.map((stage) =>
      stage.id === stageId
        ? { ...stage, items: [...stage.items, itemId] }
        : stage
    ),
  };
}

export function removeItemFromStage(
  state: BoardState,
  itemId: string
): BoardState {
  return {
    ...state,
    stages: state.stages.map((stage) => ({
      ...stage,
      items: stage.items.filter((id) => id !== itemId),
    })),
  };
}

export function moveItemToDone(state: BoardState, itemId: string): BoardState {
  const updated = removeItemFromStage(state, itemId);
  return {
    ...updated,
    done: [...updated.done, itemId],
  };
}

export function addToBacklog(
  state: BoardState,
  itemId: string
): BoardState {
  return {
    ...state,
    backlog: [...state.backlog, itemId],
  };
}

export function getStageWip(state: BoardState, stageId: string): number {
  return state.stages.find((s) => s.id === stageId)?.items.length ?? 0;
}
