import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { apiClient } from "@/lib/api";
import { getMockDatabase } from "@/mocks";
import CurriculaPage from "./CurriculaPage";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

setupDepartmentHeadMockApi();
afterEach(() => vi.restoreAllMocks());

function requestBody(call: unknown[]) {
  return (call[1] as { body: Record<string, unknown> }).body;
}

describe("Curriculum version dialog", () => {
  it("saves a version that totals zero units without asking for them", async () => {
    for (const version of getMockDatabase().curriculumVersions)
      version.total_units = 0;
    const patch = vi.spyOn(apiClient, "PATCH");
    renderDepartmentHead(<CurriculaPage />);
    await screen.findByText("Year 1 · Semester 1");

    fireEvent.click(screen.getByRole("button", { name: "Edit version" }));
    const form = within(screen.getByRole("dialog", { name: "Edit version" }));
    expect(form.queryByLabelText("Required units")).toBeNull();
    fireEvent.click(form.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/was saved\./)).toBeTruthy();
    expect(requestBody(patch.mock.calls[0])).not.toHaveProperty("total_units");
  });

  it("sends the source version when adding a copy", async () => {
    const post = vi.spyOn(apiClient, "POST");
    renderDepartmentHead(<CurriculaPage />);
    await screen.findByText("Year 1 · Semester 1");

    fireEvent.click(screen.getByRole("button", { name: "Add version" }));
    const form = within(screen.getByRole("dialog", { name: "Add version" }));
    expect(form.queryByLabelText("Required units")).toBeNull();
    fireEvent.change(form.getByLabelText("Academic year"), {
      target: { value: "2031-2032 v1" },
    });
    fireEvent.change(form.getByLabelText("Effective from"), {
      target: { value: "2031-06-01" },
    });
    fireEvent.keyDown(
      form.getByRole("combobox", { name: "Copy courses from (optional)" }),
      { key: "ArrowDown" },
    );
    const source = await screen.findByRole("option", {
      name: "BSCS · 2020-2021 v1",
    });
    fireEvent.click(source);
    fireEvent.click(form.getByRole("button", { name: "Add version" }));

    expect(
      await screen.findByText("BSCS · 2031-2032 v1 was saved."),
    ).toBeTruthy();
    const body = requestBody(post.mock.calls[0]);
    const expected = getMockDatabase().curriculumVersions.find((version) =>
      version.version_label.includes("2020-2021 v1"),
    );
    expect(body.clone_from_version_id).toBe(expected?.id);
    expect(body).not.toHaveProperty("total_units");
  });
});
