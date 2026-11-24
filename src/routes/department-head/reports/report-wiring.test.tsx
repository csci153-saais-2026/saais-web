import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import DepartmentReportsPage from "./DepartmentReportsPage";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

vi.mock("../shared/department-pdf", () => ({
  createDepartmentPdf: vi.fn(
    async () => new Blob(["%PDF"], { type: "application/pdf" }),
  ),
}));
setupDepartmentHeadMockApi();

async function openCohort() {
  renderDepartmentHead(<DepartmentReportsPage />);
  await screen.findByLabelText("Selected department report");
  const [opener] = screen.getAllByRole("button", { name: /View students for/ });
  opener.focus();
  fireEvent.click(opener);
  const dialog = await screen.findByRole("dialog", {
    name: /Batch \d{4} · Student GWA/,
  });
  return { opener, dialog };
}

describe("Department report shared-component wiring", () => {
  it("filters shared cohort views by program and keeps student names read-only", async () => {
    renderDepartmentHead(<DepartmentReportsPage />);
    await screen.findByLabelText("Selected department report");
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Degree program" }),
      { key: "ArrowDown" },
    );
    fireEvent.click(
      await screen.findByRole("option", {
        name: "Bachelor of Science in Computer Science",
      }),
    );
    const table = screen.getByRole("table", {
      name: "GWA by batch and curriculum",
    });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.textContent).toContain("BSCS");
    fireEvent.click(
      within(table).getAllByRole("button", { name: /View students for/ })[0],
    );
    const dialog = await screen.findByRole("dialog", { name: /Student GWA/ });
    const studentTable = within(dialog).getByRole("table", {
      name: "Cohort student GWA",
    });
    expect(within(studentTable).getAllByRole("row").length).toBeGreaterThan(1);
    expect(within(studentTable).queryByRole("button")).toBeNull();
    expect(within(studentTable).queryByRole("link")).toBeNull();
    for (const row of within(studentTable).getAllByRole("row").slice(1))
      expect(row.textContent).toContain("BSCS");
  });

  it("restores cohort action focus after keyboard dismissal", async () => {
    const { opener, dialog } = await openCohort();
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(opener);
    });
  });

  it("returns keyboard focus to the selected cohort action after closing", async () => {
    const { opener, dialog } = await openCohort();
    const footer = dialog.querySelector<HTMLElement>(
      '[data-slot="dialog-footer"]',
    )!;
    fireEvent.click(within(footer).getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(opener);
    });
  });
});
