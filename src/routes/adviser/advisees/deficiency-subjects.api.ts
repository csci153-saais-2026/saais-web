import { apiClient, postgrestFilter, unwrapApiResult } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'

export async function getDeficiencySubjects(studentId: string) {
  const summary = unwrapApiResult(await apiClient.GET('/functions/v1/students/{student_id}/academic-summary', { params: { path: { student_id: studentId } } }))
  if (summary.deficiencies) return [...new Set(summary.deficiencies.map(item => item.course_code).filter(Boolean))]
  const terms: ApiSchema<'TermGrades'>[] = []
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(await apiClient.GET('/functions/v1/students/{student_id}/grades', { params: { path: { student_id: studentId }, query: { limit: 100, offset } } }))
    terms.push(...page)
    if (page.length < 100) break
  }
  const openFlags = unwrapApiResult(await apiClient.GET('/rest/v1/grade_flag', { params: { query: { student_id: postgrestFilter.eq(studentId), status: postgrestFilter.eq('open'), select: 'attempt_id', limit: 1000 } } }))
  const flaggedAttemptIds = new Set(openFlags.map(flag => flag.attempt_id))
  const offeringIds = [...new Set(terms.flatMap(term => term.attempts).filter(attempt => flaggedAttemptIds.has(attempt.id) || (!attempt.is_repeated && (attempt.effective_status === 'failed' || (attempt.recorded_status === 'inc' && attempt.completion_grade == null)))).map(attempt => attempt.course_offering_id))]
  const offerings: ApiSchema<'CourseOffering'>[] = []
  for (let i = 0; i < offeringIds.length; i += 50) offerings.push(...unwrapApiResult(await apiClient.GET('/rest/v1/course_offering', { params: { query: { id: postgrestFilter.inList(offeringIds.slice(i, i + 50)), limit: 100 } } })))
  const courseIds = [...new Set(offerings.map(offering => offering.course_id))]
  const courses: ApiSchema<'Course'>[] = []
  for (let i = 0; i < courseIds.length; i += 50) courses.push(...unwrapApiResult(await apiClient.GET('/rest/v1/course', { params: { query: { id: postgrestFilter.inList(courseIds.slice(i, i + 50)), limit: 100 } } })))
  return [...new Set(courses.map(course => course.code))]
}
