import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdviserAssignmentsTable } from "@/components/features/adviser-assignments-table";
import { AuditLogTable } from "@/components/features/audit-log-table";
import { StudentDirectoryTable } from "@/components/features/student-directory-table";
import type { DeanStudentSummary } from "@/routes/dean/types";

const student: DeanStudentSummary = {
  studentId: "student-1",
  studentNumber: "24-1-00124",
  name: "Ana Marie Santos",
  initials: "AS",
  departmentId: "dcst",
  department: "DCST",
  curriculum: "BSCS 2024",
  adviser: "Unassigned",
  hasAdviser: false,
  program: "BSCS",
  yearLabel: "2nd year",
  email: "ana@example.edu",
  standing: "good",
  gwa: "1.75",
  unitsEarned: 25,
  unitsRequired: 150,
  entryYear: 2024,
};

describe("shared tables with their original Dean props", () => {
  it("keeps department data, keyboard selection and empty-filter reset", () => {
    const select = vi.fn();
    const reset = vi.fn();
    const { rerender } = render(
      <StudentDirectoryTable
        students={[student]}
        totalCount={3}
        onSelectStudent={select}
        onResetFilters={reset}
      />,
    );
    const table = within(
      screen.getByRole("table", { name: "Student directory" }),
    );
    expect(
      table.getByRole("columnheader", { name: "Department" }),
    ).toBeTruthy();
    expect(table.getByText("DCST")).toBeTruthy();
    expect(screen.getByText("Showing 1 of 3 students")).toBeTruthy();
    fireEvent.keyDown(
      table.getByRole("button", { name: /Open record for Ana/ }),
      {
        key: "Enter",
      },
    );
    expect(select).toHaveBeenCalledExactlyOnceWith(student);

    rerender(
      <StudentDirectoryTable
        students={[]}
        totalCount={3}
        onSelectStudent={select}
        onResetFilters={reset}
      />,
    );
    fireEvent.click(table.getByRole("button", { name: "Reset filters" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("keeps the adviser status and optional open action", () => {
    const select = vi.fn();
    const { rerender } = render(
      <AdviserAssignmentsTable students={[student]} onSelectStudent={select} />,
    );
    const table = within(
      screen.getByRole("table", { name: "Adviser assignments" }),
    );
    expect(
      table.getByRole("columnheader", { name: "Assignment status" }),
    ).toBeTruthy();
    expect(table.getAllByText("Unassigned")).toHaveLength(2);
    fireEvent.click(
      table.getByRole("button", { name: "Open Ana Marie Santos" }),
    );
    expect(select).toHaveBeenCalledExactlyOnceWith(student);

    rerender(<AdviserAssignmentsTable students={[student]} />);
    expect(table.queryByRole("button")).toBeNull();
  });

  it("keeps the Dean audit headers, action display and custom empty message", () => {
    const { rerender } = render(
      <AuditLogTable
        entries={[
          {
            id: "view",
            timestamp: "Aug 15, 2025",
            actor: "Dr. Reyes",
            action: "View",
            student: student.name,
            details: "Viewed the checklist",
          },
        ]}
      />,
    );
    const table = within(screen.getByRole("table", { name: "Audit log" }));
    expect(
      table.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual(["When", "Who", "Action", "Student", "Details"]);
    expect(table.getByText("Dr. Reyes")).toBeTruthy();
    expect(table.getByText("View")).toBeTruthy();
    rerender(<AuditLogTable entries={[]} emptyMessage="No activity today." />);
    expect(
      table.getByRole("cell", { name: "No activity today." }),
    ).toBeTruthy();
  });
});
