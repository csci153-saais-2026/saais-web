import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  CohortGwaTable,
  type CohortGwaRow,
} from "@/components/features/cohort-gwa-table";

afterEach(cleanup);

const cohort: CohortGwaRow = {
  id: "cohort-2025-bscs",
  entryYear: 2025,
  studyRange: "2025–2029",
  curriculum: "BSCS 2025",
  students: 2,
  meanGwa: "1.75",
};

describe("Department Head cohort wiring", () => {
  it("captures the opening button while preserving the existing row callback", () => {
    const onOpenerChange = vi.fn();
    const onViewStudents = vi.fn();
    render(
      <CohortGwaTable
        rows={[cohort]}
        onViewStudents={onViewStudents}
        onOpenerChange={onOpenerChange}
      />,
    );
    const opener = screen.getByRole("button", { name: /View students/ });
    fireEvent.click(opener);
    expect(onOpenerChange).toHaveBeenCalledExactlyOnceWith(opener);
    expect(onViewStudents).toHaveBeenCalledExactlyOnceWith(cohort);
  });
});
