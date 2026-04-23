import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdvancedPanel } from "./AdvancedPanel";
import { useConfigStore } from "@/store/config-store";
import { DistributionType } from "@/engine/types";

describe("AdvancedPanel", () => {
  beforeEach(() => {
    useConfigStore.getState().reset();
  });

  it("renders one stage row per stage in defaultBoard", () => {
    render(<AdvancedPanel />);
    const { board } = useConfigStore.getState();
    for (const stage of board.stages) {
      expect(screen.getByDisplayValue(stage.name)).toBeInTheDocument();
    }
  });

  it("editing a stage name propagates to store", () => {
    render(<AdvancedPanel />);
    const nameInput = screen.getByDisplayValue(
      useConfigStore.getState().board.stages[0]!.name
    );
    fireEvent.change(nameInput, { target: { value: "New Analysis" } });
    expect(useConfigStore.getState().board.stages[0]!.name).toBe("New Analysis");
  });

  it("toggling WIP unlimited sets wipLimit to null and back", () => {
    render(<AdvancedPanel />);
    const checkboxes = screen.getAllByRole("checkbox", { name: /unlimited/i });
    const firstCheckbox = checkboxes[0]!;

    expect(useConfigStore.getState().board.stages[0]!.wipLimit).not.toBeNull();

    fireEvent.click(firstCheckbox);
    expect(useConfigStore.getState().board.stages[0]!.wipLimit).toBeNull();

    fireEvent.click(firstCheckbox);
    expect(useConfigStore.getState().board.stages[0]!.wipLimit).not.toBeNull();
  });

  it("selecting the bottleneck preset replaces the whole board", () => {
    render(<AdvancedPanel />);
    const presetSelect = screen.getByLabelText("Preset");
    fireEvent.change(presetSelect, { target: { value: "bottleneck" } });

    const { board } = useConfigStore.getState();
    const reviewStage = board.stages.find((s) => s.id === "review");
    expect(reviewStage).toBeDefined();
    expect(reviewStage!.serviceTime.params["rate"]).toBe(0.2);
  });

  it("changing distribution type resets params", () => {
    render(<AdvancedPanel />);
    const firstStageId = useConfigStore.getState().board.stages[0]!.id;
    const distSelect = screen.getByTestId(`dist-type-${firstStageId}`);

    fireEvent.change(distSelect, { target: { value: DistributionType.Uniform } });

    const stage = useConfigStore.getState().board.stages[0]!;
    expect(stage.serviceTime.type).toBe(DistributionType.Uniform);
    expect(stage.serviceTime.params).toEqual({ min: 0, max: 1 });
    expect(Object.keys(stage.serviceTime.params)).not.toContain("rate");
  });

  it("Add stage appends a stage", () => {
    render(<AdvancedPanel />);
    const initialCount = useConfigStore.getState().board.stages.length;
    const addBtn = screen.getByText("Add stage");
    fireEvent.click(addBtn);
    expect(useConfigStore.getState().board.stages).toHaveLength(initialCount + 1);
  });

  it("Delete is disabled when only one stage remains; enabled otherwise", () => {
    const { board } = useConfigStore.getState();
    useConfigStore.getState().setBoard({
      ...board,
      stages: [board.stages[0]!],
    });

    render(<AdvancedPanel />);
    const deleteButtons = screen.getAllByLabelText(/delete stage/i);
    expect(deleteButtons[0]).toBeDisabled();
  });

  it("editing seed updates the store", () => {
    render(<AdvancedPanel />);
    const seedInput = screen.getByLabelText("Seed");
    fireEvent.change(seedInput, { target: { value: "99" } });
    expect(useConfigStore.getState().seed).toBe(99);
  });

  it("Copy link writes URL to clipboard and shows Copied! feedback", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<AdvancedPanel />);
    const copyBtn = screen.getByText("Copy link");
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalled();
  });
});
