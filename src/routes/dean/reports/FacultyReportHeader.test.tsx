import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FacultyReportHeader } from "@/routes/dean/reports/FacultyReportHeader";

describe("FacultyReportHeader", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Reports heading with only the faculty name subheading and triggers PDF export", () => {
    const onDepartmentChange = vi.fn();
    const onExportPdf = vi.fn();

    render(
      <FacultyReportHeader
        facultyName="Faculty of Science"
        department="DCST"
        onDepartmentChange={onDepartmentChange}
        onExportPdf={onExportPdf}
      />,
    );

    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy();
    expect(screen.getByText("Faculty of Science")).toBeTruthy();
    expect(screen.queryByText(/read-only/i)).toBeNull();
    expect(screen.queryByText(/Faculty of Computing/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(onExportPdf).toHaveBeenCalledTimes(1);
  });

  it("does not fall back to Faculty of Computing when facultyName is unavailable", () => {
    render(
      <FacultyReportHeader
        facultyName={null}
        department="All departments"
        onDepartmentChange={vi.fn()}
        onExportPdf={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy();
    expect(screen.queryByText(/Faculty of Computing/i)).toBeNull();
    expect(screen.queryByText(/read-only/i)).toBeNull();
  });
});
