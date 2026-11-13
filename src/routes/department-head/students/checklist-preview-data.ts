import type { ChecklistRow } from "@/components/features/checklist-term-group"

type PreviewTerm = { title: string; rows: ChecklistRow[]; semesterGwa?: string }

function row(code: string, title: string, status: ChecklistRow["status"]): ChecklistRow {
  return { code, title, status, unitsRequired: 3, unitsEarned: status === "passed" ? 3 : 0,
    source: status === "not-taken" ? "Not yet satisfied" : "Direct attempt", attempts: status === "not-taken" ? 0 : 1 }
}

/** Illustrative excerpts only. These are not calculated or fetched student histories. */
export const CHECKLIST_PREVIEWS: Record<string, PreviewTerm[]> = {
  "BSCS 2024": [
    { title: "Year 1 · Semester 1", semesterGwa: "1.75", rows: [row("CC 101", "Introduction to Computing", "passed"), row("CC 102", "Computer Programming 1", "passed")] },
    { title: "Year 1 · Semester 2", rows: [row("CC 103", "Computer Programming 2", "enrolled"), row("MATH 102", "Discrete Mathematics", "not-taken")] },
  ],
  "BSCS 2021": [
    { title: "Year 1 · Semester 1", semesterGwa: "1.75", rows: [row("CS 101", "Fundamentals of Computing", "passed"), row("CS 102", "Programming Fundamentals", "passed")] },
    { title: "Year 1 · Semester 2", rows: [row("CS 203", "Data Structures", "inc"), row("CS 204", "Discrete Structures", "not-taken")] },
  ],
  "BSIT 2024": [
    { title: "Year 1 · Semester 1", semesterGwa: "1.75", rows: [row("IT 101", "Introduction to Information Technology", "passed"), row("IT 102", "Introductory Programming", "passed")] },
    { title: "Year 1 · Semester 2", rows: [row("IT 103", "Programming Applications", "enrolled"), row("IT 104", "Information Management", "not-taken")] },
  ],
}
