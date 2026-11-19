import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api"
import type { EnrollmentHistoryRow } from "./EnrollmentHistoryTable"

export interface EnrollmentHistoryOfferingDetail {
  readonly code: string
  readonly title?: string | null
  readonly termLabel?: string | null
}

export interface StudentEnrollmentHistoryData {
  readonly attempts: readonly EnrollmentHistoryRow[]
  readonly offeringDetails: Readonly<
    Record<string, EnrollmentHistoryOfferingDetail>
  >
  readonly slotLabels: Readonly<Record<string, string>>
}

/**
 * Fetches the student's enrollment attempts and hydrates offering, course,
 * term, and curriculum slot lookup metadata.
 */
export async function fetchStudentEnrollmentHistory(
  studentId: string
): Promise<StudentEnrollmentHistoryData> {
  const [attemptsRes, offeringsRes, coursesRes, termsRes, slotsRes] =
    await Promise.all([
      apiClient.GET("/rest/v1/attempt_result", {
        params: {
          query: {
            student_id: postgrestFilter.eq(studentId),
            order: "created_at.desc",
          },
        },
      }),
      apiClient.GET("/rest/v1/course_offering"),
      apiClient.GET("/rest/v1/course"),
      apiClient.GET("/rest/v1/school_term"),
      apiClient.GET("/rest/v1/curriculum_term_course"),
    ])

  const rawAttempts = unwrapApiResult(attemptsRes)
  const offerings = unwrapApiResult(offeringsRes)
  const courses = unwrapApiResult(coursesRes)
  const terms = unwrapApiResult(termsRes)
  const slots = slotsRes.data ?? []

  const courseMap = new Map(courses.map((c) => [c.id, c]))
  const termMap = new Map(terms.map((t) => [t.id, t]))
  const offeringMap = new Map(offerings.map((o) => [o.id, o]))

  const offeringDetails: Record<string, EnrollmentHistoryOfferingDetail> = {}

  for (const offering of offerings) {
    const course = courseMap.get(offering.course_id)
    const term = termMap.get(offering.school_term_id)
    if (course) {
      offeringDetails[offering.id] = {
        code: course.code,
        title: course.title,
        termLabel: term ? `${term.school_year} · ${term.term_type}` : null,
      }
    }
  }

  const slotLabels: Record<string, string> = {}
  for (const slot of slots) {
    const course = slot.course_id ? courseMap.get(slot.course_id) : undefined
    const label = course?.code ?? slot.slot_label ?? null
    if (label) {
      slotLabels[slot.id] = label
    }
  }

  const attempts: EnrollmentHistoryRow[] = [...rawAttempts].sort((a, b) => {
    const aOff = offeringMap.get(a.course_offering_id)
    const bOff = offeringMap.get(b.course_offering_id)
    const aKey = aOff
      ? (termMap.get(aOff.school_term_id)?.chronological_key ?? 0)
      : 0
    const bKey = bOff
      ? (termMap.get(bOff.school_term_id)?.chronological_key ?? 0)
      : 0
    if (bKey !== aKey) return bKey - aKey
    return (b.created_at ?? "").localeCompare(a.created_at ?? "")
  })

  return {
    attempts,
    offeringDetails,
    slotLabels,
  }
}
