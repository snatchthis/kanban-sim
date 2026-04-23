import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Board } from "./Board";
import type { BoardState } from "@/engine/types";
import type { WorkItemView } from "@/projections/item-catalog";
import { ClassOfService, WorkItemType } from "@/engine/types";

function makeItems(
  entries: [string, ClassOfService, boolean?][],
): Map<string, WorkItemView> {
  const map = new Map<string, WorkItemView>();
  for (const [id, cos, blocked] of entries) {
    map.set(id, {
      id,
      blocked: blocked ?? false,
      classOfService: cos,
      type: WorkItemType.Feature,
      title: "Test item",
      createdAt: 1,
      currentStageId: null,
      workStartedAt: null,
    });
  }
  return map;
}

function makeBoard(overrides: Partial<BoardState> = {}): BoardState {
  return {
    stages: [
      { id: "s1", name: "Dev", items: [], wipLimit: 3, workers: 1 },
      { id: "s2", name: "QA", items: [], wipLimit: 2, workers: 1 },
    ],
    backlog: [],
    done: [],
    currentTime: 0,
    ...overrides,
  };
}

const EMPTY_MEANS: Record<string, number> = {};

describe("Board", () => {
  it("renders one column per stage plus Backlog and Done", () => {
    const boardState = makeBoard();
    render(
      <Board
        boardState={boardState}
        items={new Map()}
        stageMeans={EMPTY_MEANS}
        currentTime={0}
      />,
    );
    const columns = screen.getAllByTestId(/column-/);
    expect(columns).toHaveLength(4);
    expect(screen.getByText("Backlog")).toBeInTheDocument();
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("QA")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders items in the matching column", () => {
    const boardState = makeBoard({
      stages: [
        { id: "s1", name: "Dev", items: ["W-1", "W-2"], wipLimit: 3, workers: 1 },
      ],
      backlog: ["W-3"],
      done: ["W-4"],
    });
    const items = makeItems([
      ["W-1", ClassOfService.Standard],
      ["W-2", ClassOfService.Expedite],
      ["W-3", ClassOfService.Standard],
      ["W-4", ClassOfService.Standard],
    ]);
    render(
      <Board
        boardState={boardState}
        items={items}
        stageMeans={EMPTY_MEANS}
        currentTime={0}
      />,
    );

    expect(screen.getByTestId("card-W-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-W-2")).toBeInTheDocument();
    expect(screen.getByTestId("card-W-3")).toBeInTheDocument();
    expect(screen.getByTestId("card-W-4")).toBeInTheDocument();

    const devColumn = screen.getByTestId("column-s1");
    expect(devColumn).toContainElement(screen.getByTestId("card-W-1"));
    expect(devColumn).toContainElement(screen.getByTestId("card-W-2"));

    const backlogColumn = screen.getByTestId("column-backlog");
    expect(backlogColumn).toContainElement(screen.getByTestId("card-W-3"));

    const doneColumn = screen.getByTestId("column-done");
    expect(doneColumn).toContainElement(screen.getByTestId("card-W-4"));
  });

  it("shows WIP badge with count/limit", () => {
    const boardState = makeBoard({
      stages: [
        { id: "s1", name: "Dev", items: ["W-1", "W-2"], wipLimit: 3, workers: 1 },
      ],
    });
    const items = makeItems([
      ["W-1", ClassOfService.Standard],
      ["W-2", ClassOfService.Standard],
    ]);
    render(
      <Board
        boardState={boardState}
        items={items}
        stageMeans={EMPTY_MEANS}
        currentTime={0}
      />,
    );
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("shows danger class when count exceeds limit", () => {
    const boardState = makeBoard({
      stages: [
        { id: "s1", name: "Dev", items: ["W-1", "W-2", "W-3"], wipLimit: 2, workers: 1 },
      ],
    });
    const items = makeItems([
      ["W-1", ClassOfService.Standard],
      ["W-2", ClassOfService.Standard],
      ["W-3", ClassOfService.Standard],
    ]);
    render(
      <Board
        boardState={boardState}
        items={items}
        stageMeans={EMPTY_MEANS}
        currentTime={0}
      />,
    );
    const badge = screen.getByText("3/2");
    expect(badge.closest(".column__wip")).toHaveClass("column__wip--danger");
  });

  it("shows blocked indicator on blocked cards", () => {
    const boardState = makeBoard({
      stages: [
        { id: "s1", name: "Dev", items: ["W-1"], wipLimit: 3, workers: 1 },
      ],
    });
    const items = makeItems([["W-1", ClassOfService.Standard, true]]);
    render(
      <Board
        boardState={boardState}
        items={items}
        stageMeans={EMPTY_MEANS}
        currentTime={0}
      />,
    );
    const card = screen.getByTestId("card-W-1");
    expect(card).toHaveClass("card--blocked");
  });

  it("returns null when boardState is null", () => {
    const { container } = render(
      <Board
        boardState={null}
        items={new Map()}
        stageMeans={EMPTY_MEANS}
        currentTime={0}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
