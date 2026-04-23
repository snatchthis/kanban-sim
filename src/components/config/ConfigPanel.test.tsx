import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfigPanel } from "./ConfigPanel";
import { useConfigStore } from "@/store/config-store";
import { DistributionType } from "@/engine/types";

describe("ConfigPanel", () => {
  beforeEach(() => {
    useConfigStore.getState().reset();
  });

  it("renders one stage editor per stage in defaultBoard", () => {
    render(<ConfigPanel />);
    const { board } = useConfigStore.getState();
    for (const stage of board.stages) {
      expect(screen.getByDisplayValue(stage.name)).toBeInTheDocument();
    }
  });

  it("changing a stage name updates the store", () => {
    render(<ConfigPanel />);
    const nameInput = screen.getByDisplayValue(
      useConfigStore.getState().board.stages[0]!.name
    );
    fireEvent.change(nameInput, { target: { value: "New Analysis" } });
    expect(useConfigStore.getState().board.stages[0]!.name).toBe("New Analysis");
  });

  it("toggling Unlimited sets wipLimit to null and back", () => {
    render(<ConfigPanel />);
    const checkboxes = screen.getAllByRole("checkbox", { name: /unlimited/i });
    const firstCheckbox = checkboxes[0]!;

    expect(useConfigStore.getState().board.stages[0]!.wipLimit).not.toBeNull();

    fireEvent.click(firstCheckbox);
    expect(useConfigStore.getState().board.stages[0]!.wipLimit).toBeNull();

    fireEvent.click(firstCheckbox);
    expect(useConfigStore.getState().board.stages[0]!.wipLimit).not.toBeNull();
  });

  it("picking a new preset replaces the full board", () => {
    render(<ConfigPanel />);
    const presetSelect = screen.getByLabelText("Preset");
    fireEvent.change(presetSelect, { target: { value: "bottleneck" } });

    const { board } = useConfigStore.getState();
    const reviewStage = board.stages.find((s) => s.id === "review");
    expect(reviewStage).toBeDefined();
    expect(reviewStage!.serviceTime.params["rate"]).toBe(0.2);
  });

  it("changing distribution type resets params", () => {
    render(<ConfigPanel />);
    const firstStageId = useConfigStore.getState().board.stages[0]!.id;
    const distSelect = screen.getByTestId(`dist-type-${firstStageId}`);

    fireEvent.change(distSelect, { target: { value: DistributionType.Uniform } });

    const stage = useConfigStore.getState().board.stages[0]!;
    expect(stage.serviceTime.type).toBe(DistributionType.Uniform);
    expect(stage.serviceTime.params).toEqual({ min: 0, max: 1 });
    expect(Object.keys(stage.serviceTime.params)).not.toContain("rate");
  });

  it("Add stage grows the list", () => {
    render(<ConfigPanel />);
    const initialCount = useConfigStore.getState().board.stages.length;
    const addBtn = screen.getByText("Add stage");
    fireEvent.click(addBtn);
    expect(useConfigStore.getState().board.stages).toHaveLength(initialCount + 1);
  });

  it("Delete shrinks the list; disabled when only one stage remains", () => {
    const { board } = useConfigStore.getState();
    useConfigStore.getState().setBoard({
      ...board,
      stages: [board.stages[0]!],
    });

    render(<ConfigPanel />);
    const deleteButtons = screen.getAllByLabelText(/delete stage/i);
    expect(deleteButtons[0]).toBeDisabled();
  });

  it("changing seed updates the store", () => {
    render(<ConfigPanel />);
    const seedInput = screen.getByLabelText("Seed");
    fireEvent.change(seedInput, { target: { value: "99" } });
    expect(useConfigStore.getState().seed).toBe(99);
  });

  it("copy link button shows Copied! feedback", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ConfigPanel />);
    const copyBtn = screen.getByText("Copy link");
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalled();
  });
});
