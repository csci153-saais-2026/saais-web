import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import EquivalencePage from "./EquivalencePage";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

setupDepartmentHeadMockApi();

describe("Course Equivalence", () => {
  it("renders the policy alert and the stored equivalencies for the selected pair", async () => {
    renderDepartmentHead(<EquivalencePage />);
    expect(await screen.findByText("1 course equivalencies")).toBeDefined();
    expect(
      screen.getByText(/Equivalencies apply to a curriculum pair/i),
    ).toBeDefined();
    expect(screen.getAllByText("CSCI 101").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("BSCS 2020-2021 v1 → BSCS 2024-2025 v1").length,
    ).toBeGreaterThan(0);
  });

  it("opens the Add course equivalence dialog", async () => {
    renderDepartmentHead(<EquivalencePage />);
    await screen.findByText("1 course equivalencies");
    fireEvent.click(
      screen.getByRole("button", { name: /Add course equivalence/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Add course equivalence" }),
    ).toBeDefined();
    expect(screen.getByLabelText(/Old course subject/i)).toBeDefined();
    expect(screen.getByLabelText(/Equivalent course subject/i)).toBeDefined();
  });
});
