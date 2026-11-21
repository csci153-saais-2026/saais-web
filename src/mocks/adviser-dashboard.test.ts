import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createSaaisApiClient } from '@/lib/api'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, resetMockDatabase } from './index'
import { saaisMockServer } from './node'

const route = '/functions/v1/reports/adviser-dashboard' as const
const client = () => createSaaisApiClient({ baseUrl: 'https://saais-mock.supabase.co', apiKey: 'sb_publishable_mock_key', mode: 'mock' })
beforeAll(() => saaisMockServer.listen())
afterEach(() => { saaisMockServer.resetHandlers(); resetMockDatabase(); logoutMockPersona() })
afterAll(() => saaisMockServer.close())

describe('shared adviser dashboard mock', () => {
  it('reports only the current assignments and uses the shared attempt data', async () => {
    loginAsMockPersona('adviser')
    const report = await client().GET(route)
    expect(report.response.status).toBe(200)
    expect(report.data?.adviser_id).toBe(MOCK_IDS.adviserPrimary)
    expect(report.data?.total_advisees).toBe(14)
    expect(report.data?.pending_inc_count).toBe(1)
    expect(report.data?.grade_distribution?.total_graded).toBe(9)
    expect(report.data?.grade_distribution?.buckets.find(bucket => bucket.label === '1.75–2.25')?.count).toBe(1)
    getMockDatabase().adviserAssignments[0]!.end_date = '2026-01-01'
    const afterHandover = await client().GET(route)
    expect(afterHandover.data?.total_advisees).toBe(13)
    expect(afterHandover.data?.grade_distribution?.total_graded).toBe(8)
  })

  it('uses the selected term for grade distribution and keeps other advisers separate', async () => {
    loginAsMockPersona('adviser')
    const term = await client().GET(route, { params: { query: { school_term_id: MOCK_IDS.term2025Sem2Closed } } })
    expect(term.data?.grade_distribution?.total_graded).toBe(6)
    expect(term.data?.grade_distribution?.inc_count).toBe(1)
    loginAsMockPersona('adviser_secondary')
    expect((await client().GET(route)).data?.total_advisees).toBe(12)
    expect((await client().GET(route, { params: { query: { adviser_id: MOCK_IDS.adviserPrimary } } })).response.status).toBe(403)
  })

  it('permits scoped head reports and rejects student access', async () => {
    loginAsMockPersona('department_head')
    const report = await client().GET(route, { params: { query: { adviser_id: MOCK_IDS.adviserPrimary } } })
    expect(report.response.status).toBe(200)
    expect(report.data?.total_advisees).toBe(14)
    loginAsMockPersona('student')
    expect((await client().GET(route)).response.status).toBe(403)
  })

  it('shares student accounts, current advisers and course instructors across roster and report', async () => {
    const db = getMockDatabase()
    const students = db.profiles.filter(profile => profile.email.startsWith('sample.student'))
    expect(students).toHaveLength(24)
    for (const student of students) {
      expect(db.adviserAssignments.filter(row => row.student_id === student.id && row.end_date === null)).toHaveLength(1)
      const attempts = db.attempts.filter(row => row.student_id === student.id)
      expect(attempts).toHaveLength(student.email === 'sample.student04@vsu.edu.ph' ? 9 : 2)
      for (const attempt of attempts) {
        const offering = db.courseOfferings.find(row => row.id === attempt.course_offering_id)
        expect(attempt.instructor).toBe(offering?.instructor)
      }
    }
    loginAsMockPersona('adviser')
    const roster = await client().GET('/functions/v1/students', { params: { query: { assignment_scope: 'current' } } })
    const report = await client().GET(route)
    expect(roster.data?.total_count).toBe(14)
    expect(report.data?.total_advisees).toBe(roster.data?.total_count)
    expect(roster.data?.items.some(row => row.full_name === students[0]?.full_name)).toBe(true)
    loginAsMockPersona('adviser_secondary')
    const otherRoster = await client().GET('/functions/v1/students', { params: { query: { assignment_scope: 'current' } } })
    expect(otherRoster.data?.total_count).toBe(12)
    expect(otherRoster.data?.items.some(row => row.full_name === students[0]?.full_name)).toBe(false)
    loginAsMockPersona('adviser')
    const studentId = students[0]!.id
    const summary = await client().GET('/functions/v1/students/{student_id}/academic-summary', { params: { path: { student_id: studentId } } })
    expect(summary.data?.student_id).toBe(studentId)
    expect(summary.data?.in_progress_units).toBe(5)
    expect(summary.data?.open_inc_count).toBe(0)
    const checklist = await client().GET('/functions/v1/students/{student_id}/checklist', { params: { path: { student_id: studentId } } })
    expect(checklist.data?.filter(slot => slot.status === 'currently_enrolled')).toHaveLength(2)
    expect(checklist.data?.flatMap(slot => slot.attempts ?? []).map(attempt => attempt.instructor)).toEqual(expect.arrayContaining([expect.any(String)]))
    loginAsMockPersona('adviser_secondary')
    expect((await client().GET('/functions/v1/students/{student_id}/academic-summary', { params: { path: { student_id: studentId } } })).response.status).toBe(403)
  })

  it('exposes a consistent delinquency scenario for the assigned adviser', async () => {
    const student = getMockDatabase().profiles.find(profile => profile.email === 'sample.student04@vsu.edu.ph')!
    loginAsMockPersona('adviser_secondary')
    const roster = await client().GET('/functions/v1/students', { params: { query: { assignment_scope: 'current' } } })
    const row = roster.data?.items.find(item => item.student_id === student.id)
    expect(row?.is_delinquent).toBe(true)
    expect(roster.data?.flagged_count).toBe(
      roster.data?.items.filter(item => item.open_flags_count > 0).length,
    )
    const summary = await client().GET('/functions/v1/students/{student_id}/academic-summary', { params: { path: { student_id: student.id } } })
    expect(summary.data?.is_delinquent).toBe(true)
    expect(summary.data?.failed_units).toBe(26)
    const grades = await client().GET('/functions/v1/students/{student_id}/grades', { params: { path: { student_id: student.id } } })
    expect(grades.data?.flatMap(term => term.attempts).filter(attempt => attempt.final_grade === 5)).toHaveLength(9)
    const result = getMockDatabase().attemptResults.find(attempt => attempt.student_id === student.id && attempt.units_attempted === 3)!
    result.final_grade = 2
    result.effective_status = 'passed'
    const afterCorrection = await client().GET('/functions/v1/students', { params: { query: { assignment_scope: 'current', search: student.student_number! } } })
    expect(afterCorrection.data?.items[0]?.is_delinquent).toBe(false)
    loginAsMockPersona('adviser')
    const otherRoster = await client().GET('/functions/v1/students', { params: { query: { assignment_scope: 'current' } } })
    expect(otherRoster.data?.items.some(item => item.student_id === student.id)).toBe(false)
  })
  it('shares connected records across the student, assigned adviser, head and admin', async () => {
    const student = getMockDatabase().profiles.find(profile => profile.email === 'sample.student01@vsu.edu.ph')!
    loginAsMockPersona('student_sample_1')
    const notes = await client().GET('/rest/v1/advising_note')
    expect(notes.data?.some(note => note.student_id === student.id && note.is_archived)).toBe(true)
    expect(notes.data?.every(note => note.student_id === student.id)).toBe(true)
    const notifications = await client().GET('/rest/v1/notification')
    expect(notifications.data?.some(note => note.recipient_id === student.id)).toBe(true)
    const attempts = await client().GET('/rest/v1/attempt')
    expect(attempts.data?.filter(attempt => attempt.student_id === student.id)).toHaveLength(2)
    loginAsMockPersona('adviser')
    expect((await client().GET('/rest/v1/advising_note')).data?.some(note => note.student_id === student.id)).toBe(true)
    loginAsMockPersona('adviser_secondary')
    expect((await client().GET('/rest/v1/advising_note')).data?.some(note => note.student_id === student.id)).toBe(false)
    loginAsMockPersona('department_head')
    expect((await client().GET('/rest/v1/advising_note')).data?.some(note => note.student_id === student.id)).toBe(true)
    loginAsMockPersona('admin')
    expect((await client().GET('/rest/v1/advising_note')).data?.some(note => note.student_id === student.id)).toBe(true)
  })

  it('updates the sample summary and roster after encoding grades', async () => {
    loginAsMockPersona('adviser')
    const db = getMockDatabase()
    const student = db.profiles.find(row => row.email === 'sample.student01@vsu.edu.ph')!
    const path = { student_id: student.id }
    const encoded = await client().POST('/functions/v1/students/{student_id}/encode-grades', {
      params: { path }, body: { school_term_id: MOCK_IDS.term2026Sem1Open, rows: [{ course_offering_id: MOCK_IDS.offeringCsci101, final_grade: 2, continue_with_prerequisite_override: false }] },
    })
    expect(encoded.response.status).toBe(200)
    const summary = await client().GET('/functions/v1/students/{student_id}/academic-summary', { params: { path } })
    const roster = await client().GET('/functions/v1/students', { params: { query: { assignment_scope: 'current' } } })
    const row = roster.data?.items.find(item => item.student_id === student.id)
    expect(summary.data?.earned_units).toBe(3)
    expect(summary.data?.earned_units).toBe(row?.earned_units)
    expect(summary.data?.remaining_units).toBe(summary.data!.required_units - 3)
    expect(summary.data?.slots_satisfied).toBe(1)
    expect(summary.data?.gwa).toBe(row?.gwa)
    db.gradeFlags.push({ ...db.gradeFlags[0]!, id: '89000000-0000-4000-8001-000000000001', student_id: student.id })
    expect((await client().GET('/functions/v1/students/{student_id}/academic-summary', { params: { path } })).data?.open_flags_count).toBe(1)
  })

  it('keeps every retake on the checklist and uses the passing result', async () => {
    loginAsMockPersona('adviser')
    const db = getMockDatabase()
    const student = db.profiles.find(row => row.email === 'sample.student01@vsu.edu.ph')!
    const original = db.attemptResults.find(row => row.student_id === student.id && row.course_offering_id === MOCK_IDS.offeringCsci101)!
    Object.assign(original, { recorded_status: 'failed', effective_status: 'failed', final_grade: 5 })
    const retakeOfferingId = '62000000-0000-4000-8001-000000000099'
    db.courseOfferings.push({ ...db.courseOfferings.find(row => row.id === MOCK_IDS.offeringCsci101)!, id: retakeOfferingId })
    const retake = { ...original, id: '80000000-0000-4000-8001-000000000099', course_offering_id: retakeOfferingId, recorded_status: 'passed' as const, effective_status: 'passed' as const, final_grade: 2, created_at: '2026-11-11T00:00:00Z' }
    db.attemptResults.push({ ...retake, recorded_status: 'currently_enrolled', effective_status: 'currently_enrolled', final_grade: null })
    const path = { student_id: student.id }
    const pendingSummary = await client().GET('/functions/v1/students/{student_id}/academic-summary', { params: { path } })
    expect(pendingSummary.data?.gwa).toBe(5)
    expect(pendingSummary.data?.failed_units).toBe(3)
    db.attemptResults[db.attemptResults.length - 1] = retake
    const checklist = await client().GET('/functions/v1/students/{student_id}/checklist', { params: { path } })
    const slot = checklist.data?.find(row => row.curriculum_term_course_id === MOCK_IDS.slotCsci101)
    expect(slot?.status).toBe('passed')
    expect(slot?.earned_units).toBe(3)
    expect(slot?.source_attempt_id).toBe(retake.id)
    expect(slot?.attempts?.map(row => row.attempt_id)).toEqual([original.id, retake.id])
    const summary = await client().GET('/functions/v1/students/{student_id}/academic-summary', { params: { path } })
    expect(summary.data?.gwa).toBe(2)
    expect(summary.data?.earned_units).toBe(3)
  })

  it('limits note archive and restore to the current adviser and admin while students can read archived notes', async () => {
    const db = getMockDatabase()
    const student = db.profiles.find(row => row.email === 'sample.student01@vsu.edu.ph')!
    const note = db.advisingNotes.find(row => row.student_id === student.id)!
    const path = { student_id: student.id, note_id: note.id }
    const patch = (is_archived: boolean) => client().PATCH('/functions/v1/students/{student_id}/notes/{note_id}', { params: { path }, body: { is_archived } })
    loginAsMockPersona('adviser_secondary')
    expect((await patch(false)).response.status).toBe(403)
    loginAsMockPersona('department_head')
    expect((await patch(false)).response.status).toBe(403)
    loginAsMockPersona('adviser')
    expect((await patch(false)).data?.is_archived).toBe(false)
    expect((await patch(true)).data?.is_archived).toBe(true)
    loginAsMockPersona('student_sample_1')
    expect((await client().GET('/rest/v1/advising_note')).data?.find(row => row.id === note.id)?.is_archived).toBe(true)
    loginAsMockPersona('admin')
    expect((await patch(false)).data?.is_archived).toBe(false)
    loginAsMockPersona('adviser')
    db.adviserAssignments.find(row => row.student_id === student.id)!.end_date = '2026-11-01'
    expect((await patch(true)).response.status).toBe(403)
  })

})
