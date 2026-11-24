import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
  it("exposes a named table for assistive technology", () => {
    render(<AcademicTermsTable rows={[openTerm]} />);
    expect(screen.getByRole("table", { name: "Academic terms" })).toBeTruthy();
  });
});
