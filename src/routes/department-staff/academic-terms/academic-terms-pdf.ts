import type { DepartmentPdfDocument } from "@/routes/department-head/shared/department-pdf";
import type {
  DepartmentTermEncoding,
  SchoolTerm,
} from "./academic-terms.api";

function termTypeLabel(termType: SchoolTerm["term_type"]): string {
  return termType === "Summer" ? "Summer/Midyear" : termType;
}

function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "Not provided";

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return `Invalid date (${value})`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildAcademicTermsPdf(
  terms: readonly SchoolTerm[],
  closureByTermId: Map<string, DepartmentTermEncoding>,
): DepartmentPdfDocument {
  const open = terms.filter(
    (term) => !term.is_locked && closureByTermId.get(term.id)?.is_closed !== true,
  ).length;

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
        rows: terms.map((term) => {
          const closed =
            term.is_locked ||
            closureByTermId.get(term.id)?.is_closed === true;
          return [
            `${term.start_year}-${term.end_year}`,
            termTypeLabel(term.term_type).toLowerCase(),
            `${formatCalendarDate(term.starts_on)} - ${formatCalendarDate(term.ends_on)}`,
            formatCalendarDate(term.encoding_deadline),
            closed ? "Closed" : "Open",
          ];
        }),
        note: `${open} open ${open === 1 ? "term" : "terms"} | ${terms.length - open} closed ${terms.length - open === 1 ? "term" : "terms"} | Department scope`,
      },
    ],
  };
}
