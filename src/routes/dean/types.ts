import type { ChecklistRow } from "@/components/features/checklist-term-group"
import type { GradeBand } from "@/components/features/grade-distribution"
import type { Status } from "@/components/ui/status-badge"

export type DepartmentFilter =
  | "All departments"
  | "DCST"
  | "DIT Alang-alang"
  | "DIT Isabel"

export interface BatchCurriculumRow {
  batch: string
  curriculum: string
  students: number
  meanGwa: string
}

export interface CohortStudentSample {
  studentNumber: string
  name: string
  gwa: string
}

export interface FacultyDepartmentReport {
  department: DepartmentFilter
  students: number
  meanGwa: string
  withDeficiencies: number
  bands: GradeBand[]
  batchRows: BatchCurriculumRow[]
  cohortSamples: Record<string, CohortStudentSample[]>
}

export interface DeanStudentSummary {
  studentNumber: string
  name: string
  initials: string
  department: Exclude<DepartmentFilter, "All departments">
  curriculum: string
  adviser: string
  program: string
  yearLabel: string
  email: string
  standing: Extract<Status, "good" | "flagged" | "delinquent">
  gwa: string
  unitsEarned: number
  unitsRequired: number
}

export interface DeanChecklistTerm {
  id: string
  title: string
  description: string
  passedUnits: number
  totalUnits: number
  semesterGwa?: string
  rows: ChecklistRow[]
}

export interface DeanGradeTermRow {
  term: string
  code: string
  title: string
  units: number
  finalGrade: string
  status: Status
  remarks?: string
}

export interface DeanCourseInfo {
  code: string
  title: string
  units: number
  prerequisites: string
  description: string
}

export interface DeanStudentDetail extends DeanStudentSummary {
  checklistTerms: DeanChecklistTerm[]
  gradeRows: DeanGradeTermRow[]
}

export type DeanAuditAction = "View" | "Change"

export interface DeanAuditEntry {
  id: string
  timestamp: string
  actor: string
  action: DeanAuditAction
  student: string
  studentNumber?: string
  details: string
}
