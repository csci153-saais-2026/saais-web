import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { getMockDatabase } from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import EquivalencePage from "./EquivalencePage";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

setupDepartmentHeadMockApi();

async function chooseOption(trigger: HTMLElement, name: string | RegExp) {
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name }));
}

async function openAddDialog() {
  renderDepartmentHead(<EquivalencePage />);
  await screen.findByText("1 course equivalencies");
  fireEvent.click(
    screen.getByRole("button", { name: "Add course equivalence" }),
  );
  return within(screen.getByRole("dialog", { name: "Add course equivalence" }));
}

describe("Curriculum-pair equivalence", () => {
  it("deletes the selected API rule and shows the post-write empty state", async () => {
    renderDepartmentHead(<EquivalencePage />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete equivalence CSCI 101 to CSCI 101",
      }),
    );
    const dialog = within(
      screen.getByRole("dialog", { name: "Delete course equivalence" }),
    );
    fireEvent.click(dialog.getByRole("button", { name: "Delete equivalence" }));
    expect(await screen.findByText("Course equivalence deleted.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByText("No equivalencies recorded for this pair."),
    ).toBeTruthy();
    expect(getMockDatabase().curriculumPairEquivalences).toHaveLength(0);
  });

  it("retains the selected rule and confirmation when deletion fails", async () => {
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    saaisMockServer.use(
      http.delete(
        "*/functions/v1/catalog/curriculum-pair-equivalences/:id",
        async () => {
          await responseGate;
          return HttpResponse.json(
            { code: "CONFLICT", message: "The rule could not be removed." },
            { status: 409 },
          );
        },
      ),
    );
    renderDepartmentHead(<EquivalencePage />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete equivalence CSCI 101 to CSCI 101",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete equivalence" }));
    try {
      expect(
        await screen.findByRole("button", { name: "Deleting…" }),
      ).toHaveProperty("disabled", true);
    } finally {
      releaseResponse();
    }
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "The rule could not be removed.",
    );
    expect(getMockDatabase().curriculumPairEquivalences).toHaveLength(1);
  });

  it("shows loading and API errors and can retry the original reads", async () => {
    saaisMockServer.use(
      http.get("*/rest/v1/curriculum_pair_equivalence", async () => {
        await delay(50);
        return HttpResponse.json(
          { code: "UNAVAILABLE", message: "Equivalencies unavailable." },
          { status: 500 },
        );
      }),
    );
    renderDepartmentHead(<EquivalencePage />);
    expect(document.querySelector("[skullet-status]")?.textContent).toContain(
      "Loading equivalencies",
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Equivalencies unavailable."),
    );
    saaisMockServer.resetHandlers();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1 course equivalencies")).toBeTruthy();
  });

  it("retains form choices after an API creation failure", async () => {
    saaisMockServer.use(
      http.post("*/functions/v1/catalog/curriculum-pair-equivalences", () =>
        HttpResponse.json(
          { code: "CONFLICT", message: "Mapping was rejected." },
          { status: 409 },
        ),
      ),
    );
    const dialog = await openAddDialog();
    await chooseOption(
      dialog.getByRole("combobox", { name: "Old course subject" }),
      /CSCI 102/,
    );
    await chooseOption(
      dialog.getByRole("combobox", { name: "Equivalent course subject" }),
      /CSCI 153/,
    );
    fireEvent.click(dialog.getByRole("button", { name: "Add equivalence" }));
    expect(await dialog.findByRole("alert")).toHaveProperty(
      "textContent",
      "Mapping was rejected.",
    );
    expect(
      dialog.getByRole("combobox", { name: "Old course subject" }).textContent,
    ).toContain("CSCI 102");
  });
  it("adds a one-to-one mapping to the selected pair through the API", async () => {
    const dialog = await openAddDialog();
    await chooseOption(
      dialog.getByRole("combobox", { name: "Old course subject" }),
      /CSCI 102/,
    );
    await chooseOption(
      dialog.getByRole("combobox", { name: "Equivalent course subject" }),
      /CSCI 153/,
    );
    fireEvent.click(dialog.getByRole("button", { name: "Add equivalence" }));
    expect(
      await screen.findByText("Added equivalence for CSCI 102 → CSCI 153."),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText("2 course equivalencies")).toBeTruthy(),
    );
  });

  it.each([
    ["source conflict", /CSCI 101/, /CSCI 153/],
    ["destination conflict", /CSCI 102/, /CSCI 101/],
  ])(
    "rejects a %s without changing the pair",
    async (_scenario, source, destination) => {
      const dialog = await openAddDialog();
      await chooseOption(
        dialog.getByRole("combobox", { name: "Old course subject" }),
        source,
      );
      await chooseOption(
        dialog.getByRole("combobox", { name: "Equivalent course subject" }),
        destination,
      );
      fireEvent.click(dialog.getByRole("button", { name: "Add equivalence" }));
      expect(dialog.getByRole("alert").textContent).toContain(
        "already mapped in this curriculum pair",
      );
      fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.getByText("1 course equivalencies")).toBeTruthy();
    },
  );

  it("shows an empty state for a pair without mappings", async () => {
    renderDepartmentHead(<EquivalencePage />);
    await screen.findByText("1 course equivalencies");
    await chooseOption(
      screen.getByRole("combobox", { name: "To curriculum" }),
      "BSCS 2027-2028 v1",
    );
    expect(screen.getByText("0 course equivalencies")).toBeTruthy();
    expect(
      screen.getByText("No equivalencies recorded for this pair."),
    ).toBeTruthy();
  });
});
