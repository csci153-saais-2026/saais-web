import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CohortStudentsDialog } from "@/routes/dean/reports/CohortStudentsDialog";

describe("CohortStudentsDialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Adviser-style cohort table and passes studentId on click", () => {
    const onOpenChange = vi.fn();
    const onOpenStudent = vi.fn();

    render(
      <CohortStudentsDialog
        batch={{
          batch: "2023",
          curriculum: "BSCS 2025–present",
          students: 96,
          meanGwa: "2.02",
        }}
        students={[
          {
            studentId: "stu-1",
            studentNumber: "23-1-01234",
            name: "Ana Reyes",
            curriculum: "BSCS 2025–present",
            gwa: "1.72",
          },
          {
            studentId: "stu-2",
            studentNumber: "23-1-01301",
            name: "Ben Lopez",
            curriculum: "BSCS 2025–present",
            gwa: "2.10",
          },
        ]}
        open
        onOpenChange={onOpenChange}
        onOpenStudent={onOpenStudent}
      />,
    );

    expect(screen.getByText("Batch 2023 · Student GWA")).toBeTruthy();
    expect(screen.getByText("BSCS 2025–present · 96 students")).toBeTruthy();
    expect(screen.getByText("Student ID")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ana Reyes" }));
    expect(onOpenStudent).toHaveBeenCalledWith("stu-1");
  });
});
