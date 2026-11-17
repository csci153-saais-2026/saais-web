import type { GradeBand } from "@/components/features/grade-distribution"
import type { Status } from "@/components/ui/status-badge"

export type DepartmentFilter = string

export interface BatchCurriculumRow {
  batch: string
  curriculum: string
  students: number
  meanGwa: string
}

export interface CohortStudentSample {
  studentId: string
  studentNumber: string
  name: string
  gwa: string
}

export interface FacultyDepartmentReport {
  department: DepartmentFilter
  departmentCode?: string
  students: number
  meanGwa: string
  withDeficiencies: number
  bands: GradeBand[]
  batchRows: BatchCurriculumRow[]
  cohortSamples: Record<string, CohortStudentSample[]>
}

export interface DeanStudentSummary {
  studentId: string
  studentNumber: string
  name: string
  initials: string
  departmentId: string
  department: string
  curriculum: string
  adviser: string
  program: string
  yearLabel: string
  email: string
  standing: Extract<Status, "good" | "flagged" | "delinquent">
  gwa: string
  unitsEarned: number
  unitsRequired: number
  entryYear: number
}

export type DeanAuditAction = "View" | "Change" | "Sign-in"

export interface DeanAuditEntry {
  id: string
  timestamp: string
  actor: string
  action: DeanAuditAction
  student: string
  studentId?: string | null
  studentNumber?: string | null
  details: string
}
