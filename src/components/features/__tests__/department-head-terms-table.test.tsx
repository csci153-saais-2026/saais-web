import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  AcademicTermsTable,
  type AcademicTermsTableRow,
} from "../academic-terms-table";

afterEach(cleanup);

const openTerm: AcademicTermsTableRow = {
  id: "current",
  academicYear: "2026–2027",
  semester: "1st semester",
  termDates: "10 Aug – 18 Dec 2026",
  encodingDeadline: "08 Jan 2027",
  status: "Open",
};

describe("Head-facing academic terms table", () => {
  it("routes close and view actions to their selected records without adding edit powers", () => {
    const onClose = vi.fn();
    const onView = vi.fn();
    const closedTerm = {
      ...openTerm,
      id: "past",
      semester: "2nd semester",
      status: "Closed" as const,
    };
    render(
      <AcademicTermsTable
        rows={[openTerm, closedTerm]}
        onClose={onClose}
        onView={onView}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Close encoding for/ }));
    expect(onClose).toHaveBeenCalledExactlyOnceWith(openTerm);
    fireEvent.click(screen.getByRole("button", { name: "View term" }));
    expect(onView).toHaveBeenCalledExactlyOnceWith(closedTerm);
    expect(screen.queryByRole("button", { name: /edit|reopen/i })).toBeNull();
  });

  it("exposes a named table for assistive technology", () => {
    render(<AcademicTermsTable rows={[openTerm]} />);
    expect(screen.getByRole("table", { name: "Academic terms" })).toBeTruthy();
  });
});
