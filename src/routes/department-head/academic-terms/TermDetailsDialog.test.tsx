import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TermDetailsDialog } from "./TermDetailsDialog";
import type { AcademicTermRecord } from "./terms-api";

afterEach(cleanup);

const term: AcademicTermRecord = {
  id: "closed-term",
  academicYear: "2026–2027",
  semester: "1st semester",
  termDates: "10 Aug – 18 Dec 2026",
  encodingDeadline: "08 Jan 2027",
  status: "Closed",
};

describe("Department Head term details", () => {
  it("preserves the actual closure actor and note", () => {
    render(
      <TermDetailsDialog
        term={{
          ...term,
          closedBy: "Verified Head",
          closureNote: "All grades reviewed.",
        }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("Verified Head")).toBeTruthy();
    expect(screen.getByText("All grades reviewed.")).toBeTruthy();
    expect(screen.queryByText("Not recorded")).toBeNull();
  });

  it.each([undefined, "", "   "])(
    "does not invent a closer when the API supplies %s",
    (closedBy) => {
      render(
        <TermDetailsDialog term={{ ...term, closedBy }} onClose={() => {}} />,
      );
      expect(screen.getByText("Not recorded")).toBeTruthy();
      expect(screen.queryByText("Dr. Andrea Dela Cruz")).toBeNull();
    },
  );
});
