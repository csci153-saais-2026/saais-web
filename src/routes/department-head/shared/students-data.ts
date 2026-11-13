import { MOCK_STUDENTS } from "./mock-students"

/** Local UI fixtures, separate from the API contract and database seed. */
export type DirectoryStudent = {
  id: string
  name: string
  studentNumber: string
  email: string
  curriculum: string
  yearStanding: string
  adviser: string
  adviserSince?: string
  previousAdviser?: string
  scheduledAssignment?: { adviser: string; effectiveDate: string; reason: string }
}

export const SAMPLE_STUDENTS: DirectoryStudent[] = MOCK_STUDENTS.map((student) => ({
  id: student.id,
  name: student.name,
  studentNumber: student.id,
  email: student.email,
  curriculum: student.curriculum,
  yearStanding: student.yearLevel,
  adviser: student.adviser,
}))
