import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, unwrapApiResult } from "@/lib/api"
import { getRoster } from "@/routes/adviser/advisees/advisees.api"

export interface OutsideCreditRecord {
  id: string
  studentUuid: string
  studentName: string
  studentId: string
  originalCode: string
  originalTitle: string
  originalUnits: number
  originSchool: string
  grade: string
  slotId: string
  equivalentCode: string
  equivalentTitle: string
  equivalentUnits: number
  targetCurriculum: string
  entryType: "Transferee" | "Shiftee"
  unitsCredited: number
}

export interface CreditStudentOption {
  id: string
  name: string
  studentNumber: string
  curriculumId: string
  curriculumLabel: string
}

export interface DestinationSlot {
  id: string
  code: string
  title: string
  units: number
  curriculumId: string
}

export interface NewOutsideCredit {
  studentId: string
  entryType: "Transferee" | "Shiftee"
  originalCode: string
  originalTitle: string
  originalUnits: number
  originSchool: string
  grade: string
  slotId: string
  reason: string
}

const KEY = ["department-head", "outside-credits"] as const

async function getOutsideCredits() {
  const [credits, roster, slots, terms, courses] = await Promise.all([
    apiClient.GET("/rest/v1/outside_credit", { params: { query: { select: "*", order: "decided_at.desc", limit: 100 } } }).then(unwrapApiResult),
    getRoster("all"),
    apiClient.GET("/rest/v1/curriculum_term_course", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
    apiClient.GET("/rest/v1/curriculum_term", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
    apiClient.GET("/rest/v1/course", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
  ])
  const students: CreditStudentOption[] = roster.map((student) => ({
    id: student.student_id, name: student.full_name, studentNumber: student.student_number,
    curriculumId: student.curriculum_version_id, curriculumLabel: student.curriculum_label,
  }))
  const destinationSlots: DestinationSlot[] = slots.flatMap((slot) => {
    const course = courses.find((item) => item.id === slot.course_id)
    const term = terms.find((item) => item.id === slot.curriculum_term_id)
    return course && term ? [{ id: slot.id, code: course.code, title: course.title, units: slot.nominal_units, curriculumId: term.curriculum_version_id }] : []
  })
  const records = credits.filter((credit) => !credit.revoked_at).flatMap((credit): OutsideCreditRecord[] => {
    const student = students.find((item) => item.id === credit.student_id)
    const slot = destinationSlots.find((item) => item.id === credit.destination_curriculum_term_course_id)
    if (!student) return []
    return [{
      id: credit.id, studentUuid: student.id, studentName: student.name, studentId: student.studentNumber,
      originalCode: credit.original_course_code, originalTitle: credit.original_course_title, originalUnits: credit.units,
      originSchool: credit.origin_school, grade: credit.grade, slotId: credit.destination_curriculum_term_course_id,
      equivalentCode: slot?.code ?? "—", equivalentTitle: slot?.title ?? "Curriculum slot", equivalentUnits: credit.units_credited,
      targetCurriculum: student.curriculumLabel, entryType: credit.entry_type === "transferee" ? "Transferee" : "Shiftee",
      unitsCredited: credit.units_credited,
    }]
  })
  return { records, students, slots: destinationSlots }
}

export const useOutsideCredits = () => useQuery({ queryKey: KEY, queryFn: getOutsideCredits })

export function useCreditCourse() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (credit: NewOutsideCredit) =>
      unwrapApiResult(await apiClient.POST("/functions/v1/students/{student_id}/outside-credits", {
        params: { path: { student_id: credit.studentId } },
        body: {
          entry_type: credit.entryType === "Transferee" ? "transferee" : "shiftee",
          origin_school: credit.originSchool, original_course_code: credit.originalCode, original_course_title: credit.originalTitle,
          units: credit.originalUnits, grade: credit.grade, destination_curriculum_term_course_id: credit.slotId, reason: credit.reason,
        },
      })),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  })
}
