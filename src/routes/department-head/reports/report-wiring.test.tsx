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
