import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { saaisMockServer } from "@/mocks/node";
import AcademicTermsPage from "./AcademicTermsPage";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

setupDepartmentHeadMockApi();

async function openPage() {
  renderDepartmentHead(<AcademicTermsPage />);
  await screen.findByText("1 open term · 2 closed terms");
}

describe("Academic term confirmation safeguards", () => {
  it("cancels closure without writing and clears the abandoned note", async () => {
    const submitted = vi.fn(() => HttpResponse.json({}));
    saaisMockServer.use(
      http.post("*/functions/v1/school-terms/:id/close-encoding", submitted),
    );
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: /Close encoding for/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Closure note" }), {
      target: { value: "Abandoned draft" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(submitted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Close encoding for/ }));
    expect(
      (
        screen.getByRole("textbox", {
          name: "Closure note",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("");
    expect(submitted).not.toHaveBeenCalled();
  });
});
