import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FacultyBatchGwaTable } from "@/routes/dean/reports/FacultyBatchGwaTable";
import type { BatchCurriculumRow } from "@/routes/dean/types";

describe("FacultyBatchGwaTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Entry year without Study range and returns original row on View students click", () => {
    const onSelectBatch = vi.fn();
    const row: BatchCurriculumRow = {
      batch: "2025",
      curriculum: "BSCS 2025",
      students: 42,
      meanGwa: "1.85",
    };

    render(<FacultyBatchGwaTable rows={[row]} onSelectBatch={onSelectBatch} />);

    expect(
      screen.getByRole("columnheader", { name: "Entry year" }),
    ).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Study range" })).toBeNull();
    expect(screen.getByText("2025")).toBeTruthy();
    expect(screen.getByText("BSCS 2025")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("1.85")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "View students for BSCS 2025 batch 2025",
      }),
    );

    expect(onSelectBatch).toHaveBeenCalledTimes(1);
    expect(onSelectBatch).toHaveBeenCalledWith(row);
  });

  it("renders department empty message when there are no cohort rows", () => {
    render(<FacultyBatchGwaTable rows={[]} onSelectBatch={vi.fn()} />);

    expect(
      screen.getByText("No cohort records available for this department."),
    ).toBeTruthy();
  });
});
