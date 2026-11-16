import { apiClient, postgrestFilter, unwrapApiResult } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'
import { getRoster } from '../advisees.api'

type CatalogKind = 'slots' | 'terms' | 'courses' | 'offerings' | 'schoolTerms'
async function catalog(kind: CatalogKind, ids: string[]) {
  const unique = [...new Set(ids)]
  const result: (ApiSchema<'CurriculumTermCourse'> | ApiSchema<'CurriculumTerm'> | ApiSchema<'Course'> | ApiSchema<'CourseOffering'> | ApiSchema<'SchoolTerm'>)[] = []
  for (let i = 0; i < unique.length; i += 50) {
    const query = { id: postgrestFilter.inList(unique.slice(i, i + 50)), limit: 100 }
    if (kind === 'slots') result.push(...unwrapApiResult(await apiClient.GET('/rest/v1/curriculum_term_course', { params: { query } })))
    if (kind === 'terms') result.push(...unwrapApiResult(await apiClient.GET('/rest/v1/curriculum_term', { params: { query } })))
    if (kind === 'courses') result.push(...unwrapApiResult(await apiClient.GET('/rest/v1/course', { params: { query } })))
    if (kind === 'offerings') result.push(...unwrapApiResult(await apiClient.GET('/rest/v1/course_offering', { params: { query } })))
    if (kind === 'schoolTerms') result.push(...unwrapApiResult(await apiClient.GET('/rest/v1/school_term', { params: { query } })))
  }
  return result
}
export async function getChecklist(id: string) {
  const path = { student_id: id }
  const results: ApiSchema<'ChecklistSlotResult'>[] = []
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(await apiClient.GET('/functions/v1/students/{student_id}/checklist', { params: { path, query: { limit: 100, offset } } }))
    if (page.some(row => results.some(old => old.curriculum_term_course_id === row.curriculum_term_course_id))) throw new Error('Checklist pagination returned duplicate requirements.')
    results.push(...page)
    if (page.length < 100) break
  }
  const [summary, slots] = await Promise.all([
    apiClient.GET('/functions/v1/students/{student_id}/academic-summary', { params: { path } }).then(unwrapApiResult),
    catalog('slots', results.map(row => row.curriculum_term_course_id)) as Promise<ApiSchema<'CurriculumTermCourse'>[]>,
  ])
  const [terms, courses] = await Promise.all([
    catalog('terms', slots.map(slot => slot.curriculum_term_id)) as Promise<ApiSchema<'CurriculumTerm'>[]>,
    catalog('courses', slots.flatMap(slot => slot.course_id ? [slot.course_id] : [])) as Promise<ApiSchema<'Course'>[]>,
  ])
  return { results, summary, slots, terms, courses }
}
export async function getGrades(id: string) {
  const path = { student_id: id }
  const terms: ApiSchema<'TermGrades'>[] = []
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(await apiClient.GET('/functions/v1/students/{student_id}/grades', { params: { path, query: { limit: 100, offset } } }))
    if (page.some(row => terms.some(old => old.school_term_id === row.school_term_id))) throw new Error('Grade pagination returned duplicate terms.')
    terms.push(...page)
    if (page.length < 100) break
  }
  const [offerings, current, schoolTerms] = await Promise.all([
    catalog('offerings', terms.flatMap(term => term.attempts.map(a => a.course_offering_id))) as Promise<ApiSchema<'CourseOffering'>[]>,
    getRoster('current'),
    catalog('schoolTerms', terms.map(term => term.school_term_id)) as Promise<ApiSchema<'SchoolTerm'>[]>,
  ])
  const courses = await catalog('courses', offerings.map(o => o.course_id)) as ApiSchema<'Course'>[]
  const selected = current.find(s => s.student_id.toLowerCase() === id.toLowerCase())
  return { terms, offerings, courses, schoolTerms, canEdit: !!selected, studentName: selected?.full_name }
}
export async function correctGrade(studentId: string, attempt: ApiSchema<'AttemptResult'>, grade: number, reason: string, stage: 'midterm' | 'final', finalGrade?: number) {
  return unwrapApiResult(await apiClient.PATCH('/functions/v1/students/{student_id}/attempts/{attempt_id}/grades', { params: { path: { student_id: studentId, attempt_id: attempt.id } }, body: { expected_revision: attempt.revision, ...(stage === 'midterm' ? { midterm_grade: grade, midterm_status: 'graded', ...(finalGrade != null ? { final_grade: finalGrade } : {}) } : { final_grade: grade }), reason } }))
}
export async function completeInc(studentId: string, attempt: ApiSchema<'AttemptResult'>, grade: number, reason: string) {
  return unwrapApiResult(await apiClient.POST('/functions/v1/students/{student_id}/attempts/{attempt_id}/inc-completion', { params: { path: { student_id: studentId, attempt_id: attempt.id } }, body: { completion_grade: grade, reason } }))
}
export async function getIncResolution(studentId: string, attemptId: string) {
  const rows = unwrapApiResult(await apiClient.GET('/rest/v1/inc_resolution', { params: { query: { student_id: postgrestFilter.eq(studentId), attempt_id: postgrestFilter.eq(attemptId), select: 'id,student_id,attempt_id,completion_grade,resolved_by,resolved_at,updated_by,updated_at,effective_status', limit: 1 } } }))
  const result = rows.find(row => row.student_id.toLowerCase() === studentId.toLowerCase() && row.attempt_id === attemptId)
  if (!result) throw new Error('INC completion is unavailable for this attempt.')
  return result
}
export async function correctIncCompletion(studentId: string, attemptId: string, grade: number, reason: string, expectedUpdatedAt: string) {
  return unwrapApiResult(await apiClient.PATCH('/functions/v1/students/{student_id}/attempts/{attempt_id}/inc-completion', { params: { path: { student_id: studentId, attempt_id: attemptId } }, body: { completion_grade: grade, reason, expected_updated_at: expectedUpdatedAt } }))
}
