import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import CurriculaPage from "./CurriculaPage";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

setupDepartmentHeadMockApi();

describe("Curricula Builder", () => {
  it("renders the version selector, summary stats and term panels from the API", async () => {
    renderDepartmentHead(<CurriculaPage />);
    expect(await screen.findByText("Year 1 · Semester 1")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Shape the path to graduation." }),
    ).toBeDefined();
    expect(screen.getAllByText("Required units").length).toBeGreaterThan(0);
    expect(screen.getByText("Enrolled students")).toBeDefined();
    expect(screen.getByText("Effective from")).toBeDefined();
    expect(screen.getByText("1 Aug 2024")).toBeDefined();
    expect(screen.getByText("Year 1 · Semester 2")).toBeDefined();
    expect(
      screen.getByText("CSCI 101 — Introduction to Computing"),
    ).toBeDefined();
    expect(screen.getByText("CS Elective 1")).toBeDefined();
  });

  it("opens the Add version and New course dialogs", async () => {
    renderDepartmentHead(<CurriculaPage />);
    await screen.findByText("Year 1 · Semester 1");
    fireEvent.click(screen.getByRole("button", { name: /Add version/i }));
    expect(screen.getByRole("heading", { name: "Add version" })).toBeDefined();
    expect(screen.getByLabelText(/Academic year/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: /New course/i }));
    expect(screen.getByRole("heading", { name: "New course" })).toBeDefined();
    expect(screen.getByLabelText(/Course code/i)).toBeDefined();
  });
});
