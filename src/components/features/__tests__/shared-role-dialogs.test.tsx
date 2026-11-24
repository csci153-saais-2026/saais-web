import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { CohortStudentsDialog } from "@/components/features/cohort-students-dialog";
import { PdfViewerDialog } from "@/components/features/pdf-viewer-dialog";
import { StudentRecordDialog } from "@/components/features/student-record-dialog";

afterEach(cleanup);

describe("PdfViewerDialog", () => {
  it("disables Download while preparing and shows the status message", () => {
    render(
      <PdfViewerDialog
        open
        onOpenChange={() => undefined}
        title="Faculty reports"
        filename="faculty-report.pdf"
      />,
    );
    expect(screen.getByText("Preview: Faculty reports")).toBeTruthy();
    expect(screen.getByText("faculty-report.pdf")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Preparing");
    expect(
      (
        screen.getByRole("button", {
          name: "Download PDF",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows an alert when generation fails", () => {
    render(
      <PdfViewerDialog
        open
        onOpenChange={() => undefined}
        title="Report"
        filename="report.pdf"
        error
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("Unable to create");
  });

  it("embeds the PDF and links Download PDF to it", () => {
    const onDownload = vi.fn();
    render(
      <PdfViewerDialog
        open
        onOpenChange={() => undefined}
        title="Report"
        filename="report.pdf"
        url="blob:test"
        onDownload={onDownload}
      />,
    );
    expect(screen.getByTitle("Preview: Report").getAttribute("src")).toBe(
      "blob:test",
    );
    const download = screen.getByRole("link", { name: "Download PDF" });
    expect(download.getAttribute("href")).toBe("blob:test");
    expect(download.getAttribute("download")).toBe("report.pdf");
    fireEvent.click(download);
    expect(onDownload).toHaveBeenCalledOnce();
  });
});

describe("CohortStudentsDialog", () => {
  const students = [
    {
      id: "s1",
      name: "Alex Aguilar",
      studentNumber: "25-1-00100",
      curriculum: "BSCS 2024",
      gwa: "1.92",
    },
  ];

  it("renders the summary and a labelled row per student", () => {
    render(
      <CohortStudentsDialog
        open
        onOpenChange={() => undefined}
        title="Batch 2025 · Student GWA"
        summary="1 student · BSCS · Study range 2025–2029"
        students={students}
        footnote="All students in this cohort are shown."
      />,
    );
    expect(screen.getByText("Batch 2025 · Student GWA")).toBeTruthy();
    expect(screen.getByText(/Study range 2025–2029/)).toBeTruthy();
    expect(screen.getByText("Alex Aguilar")).toBeTruthy();
    const cells = Array.from(document.querySelectorAll("td"));
    expect(cells.map((cell) => cell.getAttribute("data-label"))).toEqual([
      "Student",
      "Student ID",
      "Curriculum",
      "GWA",
    ]);
    expect(
      screen.getByText("All students in this cohort are shown."),
    ).toBeTruthy();
  });

  it("opens a student only when onOpenStudent is provided", () => {
    const onOpenStudent = vi.fn();
    const { rerender } = render(
      <CohortStudentsDialog
        open
        onOpenChange={() => undefined}
        title="Batch"
        students={students}
      />,
    );
    expect(screen.queryByRole("button", { name: "Alex Aguilar" })).toBeNull();

    rerender(
      <CohortStudentsDialog
        open
        onOpenChange={() => undefined}
        title="Batch"
        students={students}
        onOpenStudent={onOpenStudent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Alex Aguilar" }));
    expect(onOpenStudent).toHaveBeenCalledWith("s1");
  });

  it("shows the empty message when there are no students", () => {
    render(
      <CohortStudentsDialog
        open
        onOpenChange={() => undefined}
        title="Batch"
        students={[]}
      />,
    );
    expect(screen.getByText("No students match this cohort.")).toBeTruthy();
  });
});

describe("StudentRecordDialog", () => {
  const student = {
    name: "Maria Isabel Bautista",
    initials: "MI",
    studentNumber: "23-1-04412",
    program: "BS Computer Science",
    yearLabel: "3rd year",
    email: "maria@example.edu",
    standing: "good" as const,
  };

  it("renders the student header, the active tab content and switches tabs", () => {
    const onActiveTabChange = vi.fn();
    render(
      <StudentRecordDialog
        open
        onOpenChange={() => undefined}
        student={student}
        activeTab="checklist"
        onActiveTabChange={onActiveTabChange}
      >
        <p>Checklist content</p>
      </StudentRecordDialog>,
    );
    expect(
      screen.getByRole("heading", { name: "Maria Isabel Bautista" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("dialog").getAttribute("aria-labelledby"),
    ).toBeTruthy();
    expect(screen.getByText("23-1-04412")).toBeTruthy();
    expect(screen.getByText("Good standing")).toBeTruthy();
    expect(screen.getByText("Checklist content")).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Grades" }));
    fireEvent.click(screen.getByRole("tab", { name: "Grades" }));
    expect(onActiveTabChange).toHaveBeenCalledWith("grades");
  });

  it("closes from the footer button", () => {
    const onOpenChange = vi.fn();
    render(
      <StudentRecordDialog
        open
        onOpenChange={onOpenChange}
        student={student}
        activeTab="checklist"
        onActiveTabChange={() => undefined}
      />,
    );
    // The dialog has an "X" close button and a footer Close button; use the footer one.
    const footer = screen
      .getByRole("dialog")
      .querySelector<HTMLElement>('[data-slot="dialog-footer"]');
    expect(footer).not.toBeNull();
    fireEvent.click(within(footer!).getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
