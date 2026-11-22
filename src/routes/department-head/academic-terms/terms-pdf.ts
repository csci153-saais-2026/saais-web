import type { DepartmentPdfDocument } from "../shared/department-pdf";
import type { AcademicTermRecord } from "./terms-api";

/** Describes the term history for the shared PDF viewer. */
export function buildTermsPdf(
  terms: AcademicTermRecord[],
): DepartmentPdfDocument {
  const open = terms.filter((term) => term.status === "Open").length;
  return {
    title: "Academic terms",
    subtitle: "Review semester dates and manage the grade encoding period.",
    filename: "SAAIS-academic-terms.pdf",
    sections: [
      {
        title: "Academic term history",
        headers: [
          "Academic year",
          "Semester",
          "Term dates",
          "Encoding deadline",
          "Status",
        ],
        weights: [1.1, 1.1, 2.2, 1.5, 0.9],
        rows: terms.map((term) => [
          term.academicYear,
          term.semester,
          term.termDates,
          term.encodingDeadline,
          term.status,
        ]),
        note: `${open} open ${open === 1 ? "term" : "terms"} | ${terms.length - open} closed ${terms.length - open === 1 ? "term" : "terms"} | DCST department scope`,
      },
    ],
  };
}
