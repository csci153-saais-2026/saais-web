import type { GradeBand } from "@/components/features/grade-distribution"

export type ProgramKey = "all" | "bscs" | "bsit"
type SingleProgram = Exclude<ProgramKey, "all">

export const REPORT_TERMS = [
  { value: "2025-2026-1", label: "AY 2025–2026 · 1st semester" },
  { value: "2024-2025-2", label: "AY 2024–2025 · 2nd semester" },
  // An explicit empty fixture exercises the assigned no-data state; not a live academic term.
  { value: "2023-2024-2", label: "AY 2023–2024 · 2nd semester (no sample)" },
]

export const REPORT_PROGRAMS: { value: ProgramKey; label: string }[] = [
  { value: "all", label: "All department programs" },
  { value: "bscs", label: "BS Computer Science" },
  { value: "bsit", label: "BS Information Technology" },
]

export type CurriculumSummary = {
  name: string
  status: "Current" | "Older"
  students: number
}

export type CohortSummary = {
  id: string
  entryYear: number
  curriculum: string
  students: number
  meanGwa: string
  program: SingleProgram
}

export type CohortStudent = {
  id: string
  name: string
  studentNumber: string
  curriculum: string
  gwa: string
}

export type DepartmentReport = {
  termId: string
  termLabel: string
  programKey: ProgramKey
  programLabel: string
  enrolled: number
  enrolmentNote: string
  meanGwa: string
  deficiencies: number
  gradeRecords: number
  distribution: (GradeBand & { count: number })[]
  curricula: CurriculumSummary[]
  cohorts: CohortSummary[]
}

type CurriculumFixture = [name: string, status: "Current" | "Older", students: number]
type CohortFixture = [year: number, curriculum: string, students: number, meanGwa: string]
type TermFixture = {
  records: number
  mix: Record<ProgramKey, number[]>
  gwa: Record<ProgramKey, string>
  deficiencies: Record<ProgramKey, number>
  enrolled: Record<SingleProgram, number>
  curricula: Record<SingleProgram, CurriculumFixture[]>
  cohorts: Record<SingleProgram, CohortFixture[]>
}

// Snapshot values from the actually loaded mockup/head-reports.js. These are not
// computed from the directory's eight students or a production GWA calculation.
const TERMS: Record<string, TermFixture> = {
  "2025-2026-1": {
    records: 3000,
    mix: { all: [32, 41, 19, 5, 3], bscs: [31, 42, 19, 5, 3], bsit: [35, 38, 19, 5, 3] },
    gwa: { all: "1.87", bscs: "1.85", bsit: "1.93" },
    deficiencies: { all: 47, bscs: 33, bsit: 14 },
    enrolled: { bscs: 428, bsit: 184 },
    curricula: {
      bscs: [["BSCS 2024", "Current", 286], ["BSCS 2021", "Older", 142]],
      bsit: [["BSIT 2024", "Current", 184]],
    },
    cohorts: {
      bscs: [[2025, "BSCS 2024", 108, "1.92"], [2024, "BSCS 2024", 96, "1.75"], [2023, "BSCS 2021", 82, "1.89"], [2022, "BSCS 2021", 60, "2.04"]],
      bsit: [[2025, "BSIT 2024", 52, "2.01"], [2024, "BSIT 2024", 48, "1.94"], [2023, "BSIT 2024", 46, "1.90"], [2022, "BSIT 2024", 38, "1.88"]],
    },
  },
  "2024-2025-2": {
    records: 2870,
    mix: { all: [30, 42, 20, 5, 3], bscs: [29, 43, 20, 5, 3], bsit: [33, 40, 19, 5, 3] },
    gwa: { all: "1.91", bscs: "1.89", bsit: "1.97" },
    deficiencies: { all: 52, bscs: 38, bsit: 14 },
    enrolled: { bscs: 401, bsit: 173 },
    curricula: {
      bscs: [["BSCS 2024", "Current", 190], ["BSCS 2021", "Older", 211]],
      bsit: [["BSIT 2024", "Current", 173]],
    },
    cohorts: {
      bscs: [[2024, "BSCS 2024", 98, "1.78"], [2023, "BSCS 2021", 86, "1.93"], [2022, "BSCS 2021", 64, "2.07"], [2021, "BSCS 2021", 53, "2.11"]],
      bsit: [[2024, "BSIT 2024", 50, "2.03"], [2023, "BSIT 2024", 47, "1.96"], [2022, "BSIT 2024", 40, "1.95"], [2021, "BSIT 2024", 36, "1.93"]],
    },
  },
}

const BAND_LABELS = ["1.00–1.50", "1.75–2.25", "2.50–3.00", "5.00", "INC / DR / NA"]
const BAND_TONES: GradeBand["tone"][] = ["primary", "soft", "neutral", "fail", "inc"]

export function getDepartmentReport(termId: string, programKey: ProgramKey): DepartmentReport | null {
  const term = TERMS[termId]
  if (!term) return null
  const programs: SingleProgram[] = programKey === "all" ? ["bscs", "bsit"] : [programKey]
  const enrolled = programs.reduce((total, program) => total + term.enrolled[program], 0)
  const gradeRecords = Math.round(term.records * enrolled / (term.enrolled.bscs + term.enrolled.bsit))
  let cumulativePercent = 0
  let allocatedRecords = 0
  const distribution = term.mix[programKey].map((percent, index) => {
    // Cumulative rounding keeps displayed category counts equal to the displayed total.
    cumulativePercent += percent
    const cumulativeRecords = Math.round(gradeRecords * cumulativePercent / 100)
    const count = cumulativeRecords - allocatedRecords
    allocatedRecords = cumulativeRecords
    return { label: BAND_LABELS[index], percent, count, detail: `${count.toLocaleString("en-US")} grades`, tone: BAND_TONES[index] }
  })

  return {
    termId,
    termLabel: REPORT_TERMS.find((option) => option.value === termId)!.label,
    programKey,
    programLabel: REPORT_PROGRAMS.find((option) => option.value === programKey)!.label,
    enrolled,
    enrolmentNote: programKey === "all" ? `BSCS ${term.enrolled.bscs} · BSIT ${term.enrolled.bsit}` : REPORT_PROGRAMS.find((option) => option.value === programKey)!.label,
    meanGwa: term.gwa[programKey],
    deficiencies: term.deficiencies[programKey],
    gradeRecords,
    distribution,
    curricula: programs.flatMap((program) => term.curricula[program].map(([name, status, students]) => ({ name, status, students }))),
    cohorts: programs.flatMap((program) => term.cohorts[program].map(([entryYear, curriculum, students, meanGwa]) => ({
      id: `${termId}-${program}-${entryYear}`,
      entryYear, curriculum, students, meanGwa, program,
    }))),
  }
}

const GIVEN_NAMES = ["Alex", "Bianca", "Carlo", "Diana", "Emilio", "Frances", "Gian", "Hannah", "Ivan", "Julia", "Kevin", "Lara"]
const FAMILY_NAMES = ["Aguilar", "Bautista", "Castro", "Domingo", "Espino", "Fernandez", "Gutierrez", "Hernandez", "Ignacio", "Javier", "Katigbak", "Lacson"]

/** Deliberately fictional drill-down rows, matching the chosen cohort's count and curriculum. */
export function getCohortStudents(cohort: CohortSummary): CohortStudent[] {
  return Array.from({ length: cohort.students }, (_, index) => ({
    id: `${cohort.id}-${index}`,
    name: `${GIVEN_NAMES[index % GIVEN_NAMES.length]} ${FAMILY_NAMES[(Math.floor(index / GIVEN_NAMES.length) + (cohort.program === "bsit" ? 5 : 0)) % FAMILY_NAMES.length]}`,
    // Dedicated ranges avoid collisions between programs or the eight directory examples.
    studentNumber: `${String(cohort.entryYear).slice(2)}-1-${String((cohort.program === "bsit" ? 95100 : 90100) + index * 3).padStart(5, "0")}`,
    curriculum: cohort.curriculum,
    gwa: Math.max(1, Math.min(3, Number(cohort.meanGwa) + ((index % 7) - 3) * 0.05)).toFixed(2),
  }))
}
