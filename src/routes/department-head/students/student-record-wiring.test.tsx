import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { getAuditEvents } from "../shared/dh-api";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";
import StudentsPage from "./StudentsPage";

setupDepartmentHeadMockApi();

it("uses accessible record tabs, returns focus and leaves the audit trail intact", async () => {
  const auditBefore = await getAuditEvents();
  renderDepartmentHead(<StudentsPage />);
  const trigger = await screen.findByRole("button", {
    name: "View Sta. Agata, Jerome Daniel S. checklist",
  });
  trigger.focus();
  fireEvent.click(trigger);

  const record = await screen.findByRole("dialog", {
    name: "Sta. Agata, Jerome Daniel S. · Student record",
  });
  const dialog = within(record);
  expect(dialog.getByText(/24-1-01798@vsu\.edu\.ph/)).toBeTruthy();
  expect(dialog.queryByText(/Good Standing|Probation/)).toBeNull();
  const checklist = dialog.getByRole("tabpanel", { name: "Checklist" });
  expect(
    await within(checklist).findByText("Year 1 · Semester 1"),
  ).toBeTruthy();

  fireEvent.mouseDown(dialog.getByRole("tab", { name: "Grades" }));
  const grades = dialog.getByRole("tabpanel", { name: "Grades" });
  expect(await within(grades).findAllByText(/GWA/)).not.toHaveLength(0);

  fireEvent.mouseDown(dialog.getByRole("tab", { name: "Audit log" }));
  const audit = dialog.getByRole("tabpanel", { name: "Audit log" });
  await waitFor(() => {
    expect(within(audit).queryByText("Record audit trail")).toBeTruthy();
  });
  fireEvent.keyDown(record, { key: "Escape" });
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(await getAuditEvents()).toEqual(auditBefore);
});
