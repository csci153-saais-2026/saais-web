import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import StudentsPage from "./StudentsPage";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

setupDepartmentHeadMockApi();

const TOTAL = 31;
const ALL = `Showing ${TOTAL} of ${TOTAL} students`;

async function openDirectory() {
  renderDepartmentHead(<StudentsPage />);
  await screen.findByText(ALL);
}

async function chooseFilter(label: string, value: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("option", { name: value }));
}

describe("Students directory", () => {
  it("summarises the department directory from the API", async () => {
    await openDirectory();
    expect(
      screen.getByText(
        `${TOTAL} enrolled students · BSCS and BSIT · AY 2025–2026, 1st semester`,
      ),
    ).toBeTruthy();
  });

  it("keeps Department Head fields and mobile cell labels in the shared directory", async () => {
    await openDirectory();
    const table = screen.getByRole("table", { name: "Department students" });
    const row = within(table)
      .getByRole("button", {
        name: "View Sta. Agata, Jerome Daniel S. checklist",
      })
      .closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells.map((cell) => cell.getAttribute("data-label"))).toEqual([
      "Student",
      "School email",
      "Curriculum",
      "Year standing",
      "Adviser",
    ]);
    expect(cells[1].textContent).toBe("24-1-01798@vsu.edu.ph");
    expect(cells[3].textContent).toMatch(/^\d+(st|nd|rd|th) year$/);
  });

  it("searches names and IDs with case and surrounding spaces ignored", async () => {
    await openDirectory();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search students" }),
      { target: { value: "  STA. AGATA  " } },
    );
    expect(screen.getByText(`Showing 1 of ${TOTAL} students`)).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "View Sta. Agata, Jerome Daniel S. checklist",
      }),
    ).toBeTruthy();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search students" }),
      { target: { value: "26-1-10002" } },
    );
    expect(screen.getByText(`Showing 1 of ${TOTAL} students`)).toBeTruthy();
  });

  it("combines filters, reports no matches and resets all controls", async () => {
    await openDirectory();
    await chooseFilter("Adviser", "Coting, Eulo Rod M.");
    expect(screen.getByText(`Showing 13 of ${TOTAL} students`)).toBeTruthy();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search students" }),
      { target: { value: "Paolo Andre Miraflor" } },
    );
    expect(screen.getByText(`Showing 1 of ${TOTAL} students`)).toBeTruthy();
    await chooseFilter("Adviser", "Polo, Marco Antonio P.");
    expect(screen.getByText("No students match these filters.")).toBeTruthy();
    expect(screen.getByText(`Showing 0 of ${TOTAL} students`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText(ALL)).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Curriculum" }).textContent,
    ).toContain("All curricula");
    expect(
      screen.getByRole("combobox", { name: "Adviser" }).textContent,
    ).toContain("All advisers");
  });

  it("opens the student's read-only record with checklist, grades and audit log tabs", async () => {
    await openDirectory();
    fireEvent.click(
      screen.getByRole("button", {
        name: "View Sta. Agata, Jerome Daniel S. checklist",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Sta. Agata, Jerome Daniel S. · Student record",
    });
    expect(await within(dialog).findByText(/Year 1 · Semester 1/)).toBeTruthy();
    expect(
      within(dialog).queryByRole("button", { name: /save|edit|record grade/i }),
    ).toBeNull();
    for (const tab of ["Checklist", "Grades", "Audit log"])
      expect(within(dialog).getByRole("tab", { name: tab })).toBeTruthy();
    fireEvent.mouseDown(within(dialog).getByRole("tab", { name: "Grades" }));
    expect(await within(dialog).findAllByText(/GWA/)).not.toHaveLength(0);
    fireEvent.mouseDown(within(dialog).getByRole("tab", { name: "Audit log" }));
    await waitFor(() =>
      expect(
        within(dialog).queryByRole("table", { name: "Student audit log" }) ??
          within(dialog).queryByText(/No audit events have been recorded/),
      ).toBeTruthy(),
    );
  });

  it("opens course info for a checklist requirement", async () => {
    await openDirectory();
    fireEvent.click(
      screen.getByRole("button", {
        name: "View Sta. Agata, Jerome Daniel S. checklist",
      }),
    );
    const record = await screen.findByRole("dialog", {
      name: "Sta. Agata, Jerome Daniel S. · Student record",
    });
    await within(record).findByText(/Year 1 · Semester 1/);
    fireEvent.click(
      within(record).getAllByRole("button", { name: "Course info" })[0],
    );
    await screen.findByText("Grade fix history");
    const info = screen.getAllByRole("dialog").at(-1)!;
    expect(within(info).getByText("Status:")).toBeTruthy();
    fireEvent.click(within(info).getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(screen.queryByText("Grade fix history")).toBeNull(),
    );
    expect(
      screen.getByRole("dialog", {
        name: "Sta. Agata, Jerome Daniel S. · Student record",
      }),
    ).toBeTruthy();
  });
});

describe("Student spreadsheet import", () => {
  const header =
    "student_number,full_name,email,program,curriculum,adviser_email,entry_year";
  const adviserEmail = "23-1-02224@vsu.edu.ph";

  async function openImport() {
    await openDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Import spreadsheet" }));
    return screen.getByRole("dialog", {
      name: "Import students from spreadsheet",
    });
  }

  function choose(dialog: HTMLElement, name: string, contents: string) {
    fireEvent.change(within(dialog).getByLabelText("Spreadsheet file"), {
      target: { files: [new File([contents], name, { type: "text/csv" })] },
    });
  }

  it("shows the required columns, the student ID format and an empty validation preview", async () => {
    const dialog = await openImport();
    expect(within(dialog).getByText(/Required columns:/)).toBeTruthy();
    expect(
      within(dialog).getByText(/YY-N-NNNNN \(example: 24-1-00124\)/),
    ).toBeTruthy();
    expect(
      within(dialog).getByRole("region", { name: "Validation preview" }),
    ).toBeTruthy();
  });

  it("rejects unsupported selections", async () => {
    const dialog = await openImport();
    choose(dialog, "notes.txt", "x");
    expect(
      await within(dialog).findByText("Choose a .xlsx or .csv file."),
    ).toBeTruthy();
  });

  it("reports a missing column before contacting the API", async () => {
    const dialog = await openImport();
    choose(
      dialog,
      "students.csv",
      "student_number,full_name\n26-1-20001,Test Student",
    );
    expect(
      await within(dialog).findByText(
        /Missing columns: email, program, curriculum, adviser_email/,
      ),
    ).toBeTruthy();
  });

  it("flags invalid rows and imports nothing until every row is valid", async () => {
    const dialog = await openImport();
    choose(
      dialog,
      "students.csv",
      `${header}
26-1-20001,Test Student,26-1-20001@vsu.edu.ph,BSCS,BSCS 2024-2025 v1,${adviserEmail},2026
26-1-20002,Other Student,26-1-20002@vsu.edu.ph,NOPE,BSCS 2024-2025 v1,${adviserEmail},2026`,
    );
    const results = await within(dialog).findByRole("region", {
      name: "Validation preview",
    });
    expect(
      await within(results).findByText("1 valid · 1 with errors"),
    ).toBeTruthy();
    expect(within(results).getByText('Unknown program "NOPE".')).toBeTruthy();
    expect(
      within(dialog).queryByRole("button", { name: /^Import \d+ student/ }),
    ).toBeNull();
  });

  it("imports a valid file through the API", async () => {
    const dialog = await openImport();
    choose(
      dialog,
      "students.csv",
      `${header}
26-1-20001,Test Student,26-1-20001@vsu.edu.ph,BSCS,BSCS 2024-2025 v1,${adviserEmail},2026`,
    );
    fireEvent.click(
      await within(dialog).findByRole("button", { name: "Import 1 student" }),
    );
    expect(await within(dialog).findByText("1 imported")).toBeTruthy();
    expect(await screen.findByText("Imported 1 student.")).toBeTruthy();
  });
});
