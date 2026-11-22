import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import CurriculaPage from "./CurriculaPage";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

setupDepartmentHeadMockApi();

function expectDeletionBlocked(reason: string | RegExp) {
  const dialog = within(screen.getByRole("dialog", { name: "Delete record" }));
  expect(dialog.getByRole("alert").textContent).toMatch(reason);
  expect(
    (dialog.getByRole("button", { name: "Delete" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
}

async function confirmDeletion() {
  const dialog = within(screen.getByRole("dialog", { name: "Delete record" }));
  fireEvent.click(dialog.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("Curriculum deletion", () => {
  it("protects a version that students are assigned to", async () => {
    renderDepartmentHead(<CurriculaPage />);
    await screen.findByText("Year 1 · Semester 1");
    fireEvent.click(screen.getByRole("button", { name: "Delete version" }));
    expectDeletionBlocked("Students are assigned to this curriculum.");
  });

  it("protects a version referenced by transfers or equivalence rules", async () => {
    renderDepartmentHead(<CurriculaPage />);
    await screen.findByText("Year 1 · Semester 1");
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Curriculum version" }),
      { key: "ArrowDown" },
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "BSCS · 2020-2021 v1" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Curriculum version" })
          .textContent,
      ).toContain("2020-2021"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete version" }));
    expectDeletionBlocked(
      /Students are assigned to this curriculum\.|is referenced by/,
    );
  });

  it("lets a new draft's last slot, empty term and version be created and deleted through the API", async () => {
    renderDepartmentHead(<CurriculaPage />);
    await screen.findByText("Year 1 · Semester 1");
    fireEvent.click(screen.getByRole("button", { name: "Add version" }));
    const versionForm = within(
      screen.getByRole("dialog", { name: "Add version" }),
    );
    fireEvent.change(versionForm.getByLabelText("Academic year"), {
      target: { value: "2030-2031 v1" },
    });
    fireEvent.change(versionForm.getByLabelText("Effective from"), {
      target: { value: "2030-06-01" },
    });
    fireEvent.click(versionForm.getByRole("button", { name: "Add version" }));
    expect(
      await screen.findByText("BSCS · 2030-2031 v1 was saved."),
    ).toBeTruthy();
    await screen.findByText(/This version has no terms yet/);

    fireEvent.click(screen.getByRole("button", { name: "Add term" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Add term" })).getByRole(
        "button",
        { name: "Add term" },
      ),
    );
    await screen.findByText("No courses in this term yet.");

    fireEvent.click(screen.getByRole("button", { name: "Add course / slot" }));
    const slotForm = within(
      screen.getByRole("dialog", { name: "Add course / slot" }),
    );
    fireEvent.change(slotForm.getByLabelText("Course / slot"), {
      target: { value: "Draft elective" },
    });
    fireEvent.click(slotForm.getByRole("button", { name: "Add" }));
    const row = await screen.findByRole("row", { name: /Draft elective/ });

    fireEvent.click(within(row).getByRole("button", { name: "Delete" }));
    await confirmDeletion();
    expect(
      await screen.findByText("No courses in this term yet."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete term" }));
    await confirmDeletion();
    expect(
      await screen.findByText(/This version has no terms yet/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete version" }));
    await confirmDeletion();
    expect(
      await screen.findByText("BSCS · 2030-2031 v1 was deleted."),
    ).toBeTruthy();
  });
});
