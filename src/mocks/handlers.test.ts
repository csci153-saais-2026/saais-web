import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  API_ERROR_CODES,
  createSaaisApiClient,
  hasApiErrorCode,
  isApiClientError,
  parseContentRange,
  postgrestFilter,
  unwrapApiResult,
} from '@/lib/api'
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
   resolveMockPersonaFromAuthHeader,
} from './index'
import { saaisMockServer } from './node'

const BASE_URL = 'https://saais-mock.supabase.co'
const TEST_API_KEY = 'sb_publishable_mock_key'

beforeAll(() => {
  saaisMockServer.listen()
})

afterEach(() => {
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})

afterAll(() => {
  saaisMockServer.close()
})

describe('MSW contract handlers & role-based authorization (Issue #43)', () => {
  it('keeps an earlier failure selected until a retake has a numeric result', async () => {
    const db = getMockDatabase()
    const earlier = db.attemptResults.find(a => a.id === MOCK_IDS.attemptCsci102Inc)!
    db.attemptResults[db.attemptResults.indexOf(earlier)] = { ...earlier, recorded_status: 'failed', effective_status: 'failed', final_grade: 5, gwa_grade: 5, inc_deadline: null }
    const oldOffering = db.courseOfferings.find(o => o.id === MOCK_IDS.offeringCsci102)!
    const newOfferingId = '62000000-0000-4000-8000-000000000099'
    db.courseOfferings.push({ ...oldOffering, id: newOfferingId, school_term_id: MOCK_IDS.term2026Sem1Open })
    const retakeId = '80000000-0000-4000-8000-000000000099'
    db.attemptResults.push({ ...earlier, id: retakeId, course_offering_id: newOfferingId, recorded_status: 'inc', effective_status: 'inc', final_grade: null, completion_grade: null, gwa_grade: null, is_lapsed_inc: false, created_at: '2026-11-01T00:00:00Z' })
    loginAsMockPersona('student')
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const read = async () => unwrapApiResult(await client.GET('/functions/v1/students/{student_id}/grades', { params: { path: { student_id: MOCK_IDS.studentPrimary } } }))
    let terms = await read()
    let prior = terms.flatMap(t => t.attempts).find(a => a.id === earlier.id)!
    let retake = terms.flatMap(t => t.attempts).find(a => a.id === retakeId)!
    expect(prior.counts_toward_cumulative_gwa).toBe(true)
    expect(prior.is_repeated).toBe(false)
    expect(retake.counts_toward_cumulative_gwa).toBe(false)
    const current = db.attemptResults.find(a => a.id === retakeId)!
    db.attemptResults[db.attemptResults.indexOf(current)] = { ...current, recorded_status: 'dr', effective_status: 'dr' }
    terms = await read()
    expect(terms.flatMap(t => t.attempts).find(a => a.id === earlier.id)?.counts_toward_cumulative_gwa).toBe(true)
    expect(terms.flatMap(t => t.attempts).find(a => a.id === retakeId)?.counts_toward_cumulative_gwa).toBe(false)
    const dropped = db.attemptResults.find(a => a.id === retakeId)!
    db.attemptResults[db.attemptResults.indexOf(dropped)] = { ...dropped, recorded_status: 'inc', effective_status: 'inc', is_lapsed_inc: true }
    terms = await read()
    prior = terms.flatMap(t => t.attempts).find(a => a.id === earlier.id)!
    retake = terms.flatMap(t => t.attempts).find(a => a.id === retakeId)!
    expect(prior.counts_toward_cumulative_gwa).toBe(true)
    expect(retake.counts_toward_cumulative_gwa).toBe(false)
    const lapsed = db.attemptResults.find(a => a.id === retakeId)!
    db.attemptResults[db.attemptResults.indexOf(lapsed)] = { ...lapsed, recorded_status: 'currently_enrolled', effective_status: 'currently_enrolled', is_lapsed_inc: false }
    loginAsMockPersona('adviser')
    const submission = await client.POST('/functions/v1/students/{student_id}/record-grades', { params: { path: { student_id: MOCK_IDS.studentPrimary } }, body: { school_term_id: MOCK_IDS.term2026Sem1Open, course_offering_id: newOfferingId, final_grade: 3.25, confirmed_enrollment: false, continue_with_prerequisite_override: false } })
    expect(submission.response.status).toBe(200)
    expect(db.attemptResults.filter(a => a.course_offering_id === newOfferingId)).toHaveLength(1)
    loginAsMockPersona('student')
    terms = await read()
    expect(terms.flatMap(t => t.attempts).find(a => a.id === earlier.id)?.is_repeated).toBe(true)
    expect(terms.flatMap(t => t.attempts).find(a => a.id === retakeId)?.counts_toward_cumulative_gwa).toBe(true)
    const graded = db.attemptResults.find(a => a.id === retakeId)!
    db.attemptResults[db.attemptResults.indexOf(graded)] = { ...graded, recorded_status: 'currently_enrolled', effective_status: 'currently_enrolled', final_grade: null, gwa_grade: null }
    loginAsMockPersona('adviser')
    const encoded = await client.POST('/functions/v1/students/{student_id}/encode-grades', { params: { path: { student_id: MOCK_IDS.studentPrimary } }, body: { school_term_id: MOCK_IDS.term2026Sem1Open, rows: [{ attempt_id: retakeId, course_offering_id: newOfferingId, final_grade: 2, continue_with_prerequisite_override: false }] } })
    expect(encoded.response.status).toBe(200)
    expect(db.attemptResults.filter(a => a.course_offering_id === newOfferingId)).toHaveLength(1)
    loginAsMockPersona('student')
    terms = await read()
    prior = terms.flatMap(t => t.attempts).find(a => a.id === earlier.id)!
    retake = terms.flatMap(t => t.attempts).find(a => a.id === retakeId)!
    expect(prior.is_repeated).toBe(true)
    expect(prior.counts_toward_cumulative_gwa).toBe(false)
    expect(retake.counts_toward_cumulative_gwa).toBe(true)
    expect(terms.find(t => t.school_term_id === MOCK_IDS.term2025Sem2Closed)?.gwa).toBe(5)
    expect(terms.find(t => t.school_term_id === MOCK_IDS.term2026Sem1Open)?.gwa).toBe(2)
    const completed = db.attemptResults.find(a => a.id === retakeId)!
    db.attemptResults[db.attemptResults.indexOf(completed)] = { ...completed, recorded_status: 'inc', effective_status: 'passed', final_grade: null, completion_grade: 2.25, gwa_grade: 2.25 }
    terms = await read()
    expect(terms.flatMap(t => t.attempts).find(a => a.id === earlier.id)?.is_repeated).toBe(true)
    expect(terms.flatMap(t => t.attempts).find(a => a.id === retakeId)?.counts_toward_cumulative_gwa).toBe(true)
    expect(terms.find(t => t.school_term_id === MOCK_IDS.term2026Sem1Open)?.gwa).toBe(2.15) // (2.25 x 3 retake units + 2.0 x 2 seeded PE completion units) / 5
  })

  it('weights cumulative GWA by units and replaces a failure only after a numeric retake result', async () => {
    const db = getMockDatabase()
    const first = db.attemptResults.find(a => a.id === MOCK_IDS.attemptCsci102Inc)!
    const second = db.attemptResults.find(a => a.id === MOCK_IDS.attemptCsci153Open)!
    db.attemptResults.splice(0, db.attemptResults.length, ...db.attemptResults.filter(a => a.student_id !== MOCK_IDS.studentPrimary))
    db.attemptResults.push(
      { ...first, recorded_status: 'failed', effective_status: 'failed', final_grade: 5, completion_grade: null, is_lapsed_inc: false, units_attempted: 6 },
      { ...second, recorded_status: 'passed', effective_status: 'passed', final_grade: 3, completion_grade: null, is_lapsed_inc: false, units_attempted: 3 },
    )
    const retake = { ...first, id: '80000000-0000-4000-8000-000000000098', recorded_status: 'inc' as const, effective_status: 'inc' as const, final_grade: null, completion_grade: null, is_lapsed_inc: false, units_attempted: 6, created_at: '2026-11-01T00:00:00Z' }
    db.attemptResults.push(retake)
    loginAsMockPersona('student')
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const read = async () => unwrapApiResult(await client.GET('/functions/v1/students/{student_id}/academic-summary', { params: { path: { student_id: MOCK_IDS.studentPrimary } } }))
    expect((await read()).gwa).toBe(4.33)
    retake.is_lapsed_inc = true
    expect((await read()).gwa).toBe(4.33)
    db.attemptResults[db.attemptResults.indexOf(retake)] = { ...retake, is_lapsed_inc: false, effective_status: 'passed', completion_grade: 2 }
    const summary = await read()
    expect(summary.gwa).toBe(2.33)
    expect(summary.counted_units).toBe(9)
  })

  it('uses the student current department closure for a cross-department course', async () => {
    const db = getMockDatabase()
    const profile = db.profiles.find(p => p.id === MOCK_IDS.studentPrimary)!
    db.profiles[db.profiles.indexOf(profile)] = { ...profile, department_id: MOCK_IDS.deptDabe }
    const course = db.courses.find(c => c.id === MOCK_IDS.courseCsci153)!
    db.courses[db.courses.indexOf(course)] = { ...course, department_id: MOCK_IDS.deptDabe }
    const closure = db.departmentTermEncodings.find(c => c.school_term_id === MOCK_IDS.term2026Sem1Open && c.department_id === MOCK_IDS.deptDcst)!
    closure.is_closed = true
    loginAsMockPersona('adviser')
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const params = { path: { student_id: MOCK_IDS.studentPrimary } }
    const body = { school_term_id: MOCK_IDS.term2026Sem1Open, course_offering_id: MOCK_IDS.offeringCsci153, confirmed_enrollment: true, continue_with_prerequisite_override: false }
    expect((await client.POST('/functions/v1/students/{student_id}/record-grades', { params, body })).response.status).toBe(409)
    closure.is_closed = false
    db.departmentTermEncodings.push({ ...closure, id: '61000000-0000-4000-8000-000000000099', department_id: MOCK_IDS.deptDabe, is_closed: true })
    expect((await client.POST('/functions/v1/students/{student_id}/record-grades', { params, body })).response.status).toBe(200)
  })

  it('retains the outgoing adviser through a cross-department transfer until reassignment', async () => {
    const db = getMockDatabase()
    const studentId = MOCK_IDS.studentPrimary
    const profile = db.profiles.find(p => p.id === studentId)!
    db.profiles[db.profiles.indexOf(profile)] = { ...profile, department_id: MOCK_IDS.deptDabe, faculty_id: MOCK_IDS.facultyEngineering }
    const adviser = db.profiles.find(p => p.id === MOCK_IDS.adviserPrimary)!
    db.profiles[db.profiles.indexOf(adviser)] = { ...adviser, department_id: MOCK_IDS.deptDabe, faculty_id: MOCK_IDS.facultyEngineering }
    const org = db.studentOrganizations.find(o => o.student_id === studentId)!
    db.studentOrganizations[db.studentOrganizations.indexOf(org)] = { ...org, department_id: MOCK_IDS.deptDabe, faculty_id: MOCK_IDS.facultyEngineering }
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    loginAsMockPersona('admin')
    const decision = await client.POST('/functions/v1/curriculum-transfers/{transfer_id}/decision', { params: { path: { transfer_id: MOCK_IDS.transferRequest1 } }, body: { decision: 'approved' } })
    expect(decision.response.status).toBe(200)
    expect(db.studentOrganizations.find(o => o.student_id === studentId)?.department_id).toBe(MOCK_IDS.deptDcst)
    expect(db.adviserAssignments.filter(a => a.student_id === studentId && a.end_date === null).map(a => a.adviser_id)).toEqual([MOCK_IDS.adviserPrimary])
    loginAsMockPersona('adviser')
    const own = { path: { student_id: studentId } }
    expect((await client.GET('/functions/v1/students/{student_id}/academic-summary', { params: own })).response.status).toBe(200)
    expect((await client.GET('/functions/v1/students/{student_id}/academic-summary', { params: { path: { student_id: MOCK_IDS.studentSecondary } } })).response.status).toBe(403)
    loginAsMockPersona('department_staff')
    const reassignment = await client.PUT('/functions/v1/students/{student_id}/adviser', { params: own, body: { adviser_id: MOCK_IDS.adviserSecondary, start_date: '2026-11-10', reason: 'Department handoff' } })
    expect(reassignment.response.status).toBe(200)
    expect(db.adviserAssignments.filter(a => a.student_id === studentId && a.end_date === null).map(a => a.adviser_id)).toEqual([MOCK_IDS.adviserSecondary])
    expect(db.adviserAssignments.find(a => a.student_id === studentId && a.adviser_id === MOCK_IDS.adviserPrimary)?.end_date).toBe('2026-11-10')
    loginAsMockPersona('adviser')
    expect((await client.GET('/functions/v1/students/{student_id}/academic-summary', { params: own })).response.status).toBe(200)
    expect((await client.POST('/functions/v1/students/{student_id}/record-grades', { params: own, body: { school_term_id: MOCK_IDS.term2026Sem1Open, course_offering_id: MOCK_IDS.offeringCsci153, confirmed_enrollment: true, continue_with_prerequisite_override: false } })).response.status).toBe(403)
  })

  it('bulk reassignment closes old assignments and opens new assignments without a gap', async () => {
    const db = getMockDatabase()
    const outgoing = db.profiles.find(p => p.id === MOCK_IDS.adviserPrimary)!
    db.profiles[db.profiles.indexOf(outgoing)] = { ...outgoing, department_id: MOCK_IDS.deptDabe }
    loginAsMockPersona('department_staff')
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const result = await client.POST('/functions/v1/adviser-assignments/bulk-reassign', { body: { student_ids: [MOCK_IDS.studentPrimary], adviser_id: MOCK_IDS.adviserSecondary, effective_since: '2026-11-10', reason: 'Transfer handoff' } })
    expect(result.response.status).toBe(200)
    const history = db.adviserAssignments.filter(a => a.student_id === MOCK_IDS.studentPrimary)
    expect(history.find(a => a.adviser_id === MOCK_IDS.adviserPrimary)?.end_date).toBe('2026-11-10')
    expect(history.find(a => a.adviser_id === MOCK_IDS.adviserSecondary)?.start_date).toBe('2026-11-10')
    expect(history.filter(a => a.end_date === null)).toHaveLength(1)
  })

  it('allows timely first INC completion during department closure and blocks correction', async () => {
    const db = getMockDatabase()
    const attempt = db.attemptResults.find(a => a.id === MOCK_IDS.attemptCsci102Inc)!
    attempt.inc_deadline = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    db.departmentTermEncodings.push({ ...db.departmentTermEncodings[0], school_term_id: MOCK_IDS.term2025Sem2Closed, is_closed: true })
    loginAsMockPersona('adviser')
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const params = { path: { student_id: MOCK_IDS.studentPrimary, attempt_id: MOCK_IDS.attemptCsci102Inc } }
    const completion = { completion_grade: 2.0, reason: 'Completed requirements' }
    expect((await client.POST('/functions/v1/students/{student_id}/attempts/{attempt_id}/inc-completion', { params, body: completion })).response.status).toBe(201)
    expect(db.attemptResults.find(a => a.id === MOCK_IDS.attemptCsci102Inc)?.gwa_grade).toBe(2)
    expect((await client.POST('/functions/v1/students/{student_id}/attempts/{attempt_id}/inc-completion', { params, body: completion })).response.status).toBe(409)
    expect((await client.PATCH('/functions/v1/students/{student_id}/attempts/{attempt_id}/inc-completion', { params, body: { ...completion, expected_updated_at: '2026-11-10T09:00:00Z' } })).response.status).toBe(409)
    expect(db.incResolutions.filter(r => r.attempt_id === MOCK_IDS.attemptCsci102Inc)).toHaveLength(1)
  })

  describe('INC completion correction', () => {
    const route = '/functions/v1/students/{student_id}/attempts/{attempt_id}/inc-completion' as const
    const correction = { completion_grade: 1.75, reason: 'Recomputed per approved form', expected_updated_at: '2026-11-10T09:00:00Z' }
    const paramsFor = (attemptId: string) => ({ path: { student_id: MOCK_IDS.studentPrimary, attempt_id: attemptId } })
    const clientFor = () => createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const seededGrade = (db: ReturnType<typeof getMockDatabase>) => db.incResolutions.find(r => r.attempt_id === MOCK_IDS.attemptPhEd11IncResolved)?.completion_grade

    it('corrects an existing completion in an editable term', async () => {
      loginAsMockPersona('adviser')
      const db = getMockDatabase()
      const previousResolution = db.incResolutions.find(r => r.attempt_id === MOCK_IDS.attemptPhEd11IncResolved)!
      const auditCount = db.auditLogEntries.length
      const response = await clientFor().PATCH(route, { params: paramsFor(MOCK_IDS.attemptPhEd11IncResolved), body: correction })
      expect(response.response.status).toBe(200)
      expect(response.data?.completion_grade).toBe(1.75)
      expect(response.data?.updated_at).not.toBe(correction.expected_updated_at)
      expect(seededGrade(db)).toBe(1.75)
      expect(db.attemptResults.find(a => a.id === MOCK_IDS.attemptPhEd11IncResolved)?.completion_grade).toBe(1.75)
      const read = unwrapApiResult(await clientFor().GET('/rest/v1/attempt_result'))
      const attempt = read.find(a => a.id === MOCK_IDS.attemptPhEd11IncResolved)
      expect(attempt?.completion_grade).toBe(1.75)
      expect(attempt?.gwa_grade).toBe(1.75)
      expect(db.auditLogEntries).toHaveLength(auditCount + 1)
      expect(db.auditLogEntries.at(-1)).toMatchObject({
        actor_id: MOCK_PERSONAS.adviser.profileId,
        actor_name: MOCK_PERSONAS.adviser.fullName,
        actor_role: 'adviser',
        student_id: MOCK_IDS.studentPrimary,
        action: 'inc_completion_corrected',
        action_category: 'grade_update',
        entity_type: 'inc_resolution',
        entity_id: previousResolution.id,
        old_value: {
          completion_grade: 2.0,
          effective_status: previousResolution.effective_status,
        },
        new_value: {
          completion_grade: 1.75,
          effective_status: 'passed',
        },
        reason: correction.reason,
      })
      expect(db.auditLogEntries.at(-1)?.created_at).toBe(response.data?.updated_at)
    })

    it('rejects a correction for an attempt without an INC completion', async () => {
      loginAsMockPersona('adviser')
      const db = getMockDatabase()
      const client = clientFor()
      expect((await client.PATCH(route, { params: paramsFor(MOCK_IDS.attemptCsci153Open), body: correction })).response.status).toBe(404)
      expect((await client.PATCH(route, { params: paramsFor(MOCK_IDS.attemptCsci102Inc), body: correction })).response.status).toBe(404)
      expect((await client.PATCH(route, { params: paramsFor('80000000-0000-4000-8000-0000000000ff'), body: correction })).response.status).toBe(404)
      expect(db.incResolutions).toHaveLength(1)
    })

    it('rejects a correction from an adviser who is not the current adviser', async () => {
      loginAsMockPersona('adviser_secondary')
      const response = await clientFor().PATCH(route, { params: paramsFor(MOCK_IDS.attemptPhEd11IncResolved), body: correction })
      expect(response.response.status).toBe(403)
    })

    it('requires the current adviser assignment even for a dean, head or admin', async () => {
      for (const persona of ['dean', 'department_head', 'admin'] as const) {
        loginAsMockPersona(persona)
        const response = await clientFor().PATCH(route, { params: paramsFor(MOCK_IDS.attemptPhEd11IncResolved), body: correction })
        expect(response.response.status).toBe(403)
        const firstCompletion = await clientFor().POST(route, { params: paramsFor(MOCK_IDS.attemptCsci102Inc), body: { completion_grade: 2, reason: 'Completion' } })
        expect(firstCompletion.response.status).toBe(403)
      }
    })

    it('allows a multi-role user who is the current adviser', async () => {
      const db = getMockDatabase()
      const assignment = db.adviserAssignments.find(a => a.student_id === MOCK_IDS.studentPrimary && a.end_date === null)!
      assignment.adviser_id = MOCK_IDS.deptHeadDcst
      loginAsMockPersona('department_head')
      const response = await clientFor().PATCH(route, { params: paramsFor(MOCK_IDS.attemptPhEd11IncResolved), body: correction })
      expect(response.response.status).toBe(200)
    })

    it('rejects a correction with a stale expected_updated_at', async () => {
      loginAsMockPersona('adviser')
      const db = getMockDatabase()
      const auditCount = db.auditLogEntries.length
      const response = await clientFor().PATCH(route, { params: paramsFor(MOCK_IDS.attemptPhEd11IncResolved), body: { ...correction, expected_updated_at: '2026-01-01T00:00:00Z' } })
      expect(response.response.status).toBe(409)
      expect(seededGrade(db)).toBe(2.0)
      expect(db.auditLogEntries).toHaveLength(auditCount)
    })

    it('stays blocked by a locked term', async () => {
      loginAsMockPersona('adviser')
      const db = getMockDatabase()
      db.schoolTerms.find(t => t.id === MOCK_IDS.term2026Sem1Open)!.is_locked = true
      const response = await clientFor().PATCH(route, { params: paramsFor(MOCK_IDS.attemptPhEd11IncResolved), body: correction })
      expect(response.response.status).toBe(409)
      expect(seededGrade(db)).toBe(2.0)
    })

    it('rejects malformed bodies with INVALID_INPUT and leaves the completion unchanged', async () => {
      loginAsMockPersona('adviser')
      const db = getMockDatabase()
      const url = `${BASE_URL}/functions/v1/students/${MOCK_IDS.studentPrimary}/attempts/${MOCK_IDS.attemptPhEd11IncResolved}/inc-completion`
      const send = (body: string) => fetch(url, { method: 'PATCH', headers: { apikey: TEST_API_KEY, Authorization: `Bearer ${MOCK_PERSONAS.adviser.token}`, 'Content-Type': 'application/json' }, body })
      const bodies = [
        'null',
        '[]',
        '"text"',
        'not json',
        JSON.stringify({ ...correction, reason: 123 }),
        JSON.stringify({ ...correction, reason: '   ' }),
        JSON.stringify({ ...correction, reason: 'x'.repeat(2001) }),
        JSON.stringify({ ...correction, completion_grade: '1.75' }),
        JSON.stringify({ ...correction, completion_grade: 1.8 }),
        JSON.stringify({ ...correction, expected_updated_at: undefined }),
        JSON.stringify({ ...correction, expected_updated_at: 'not-a-date-time' }),
        JSON.stringify({ ...correction, unexpected: true }),
      ]
      const auditCount = db.auditLogEntries.length
      for (const body of bodies) {
        const response = await send(body)
        expect(response.status, body).toBe(400)
        expect((await response.json()).code, body).toBe('INVALID_INPUT')
      }
      expect(seededGrade(db)).toBe(2.0)
      expect(db.auditLogEntries).toHaveLength(auditCount)
    })

    it('stays blocked by a department encoding closure', async () => {
      loginAsMockPersona('adviser')
      const db = getMockDatabase()
      db.departmentTermEncodings.push({ ...db.departmentTermEncodings[0], school_term_id: MOCK_IDS.term2026Sem1Open, is_closed: true })
      const response = await clientFor().PATCH(route, { params: paramsFor(MOCK_IDS.attemptPhEd11IncResolved), body: correction })
      expect(response.response.status).toBe(409)
      expect(seededGrade(db)).toBe(2.0)
    })
  })

  it('rejects a first INC completion after its deadline even when encoding is closed', async () => {
    const db = getMockDatabase()
    db.attemptResults.find(a => a.id === MOCK_IDS.attemptCsci102Inc)!.inc_deadline = '2000-01-01'
    db.departmentTermEncodings.push({ ...db.departmentTermEncodings[0], school_term_id: MOCK_IDS.term2025Sem2Closed, is_closed: true })
    loginAsMockPersona('adviser')
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const params = { path: { student_id: MOCK_IDS.studentPrimary, attempt_id: MOCK_IDS.attemptCsci102Inc } }
    expect((await client.POST('/functions/v1/students/{student_id}/attempts/{attempt_id}/inc-completion', { params, body: { completion_grade: 2, reason: 'Late completion' } })).response.status).toBe(409)
    expect(db.incResolutions.filter(r => r.attempt_id === MOCK_IDS.attemptCsci102Inc)).toHaveLength(0)
  })

  it('rejects a new attempt after a pass but allows a failed course to be retaken', async () => {
    loginAsMockPersona('adviser')
    const db = getMockDatabase()
    const existing = db.attemptResults.find(a => a.student_id === MOCK_IDS.studentPrimary && a.course_offering_id === MOCK_IDS.offeringCsci153)!
    existing.effective_status = 'passed'
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const params = { path: { student_id: MOCK_IDS.studentPrimary } }
    const body = { school_term_id: MOCK_IDS.term2026Sem1Open, course_offering_id: MOCK_IDS.offeringCsci153, confirmed_enrollment: true, continue_with_prerequisite_override: false }
    const before = db.attemptResults.length
    expect((await client.POST('/functions/v1/students/{student_id}/record-grades', { params, body })).response.status).toBe(409)
    expect(db.attemptResults.length).toBe(before)
    existing.effective_status = 'failed'
    expect((await client.POST('/functions/v1/students/{student_id}/record-grades', { params, body })).response.status).toBe(200)
  })

  it('requires and creates an initial adviser assignment for new students', async () => {
    loginAsMockPersona('department_staff')
    const token = MOCK_PERSONAS.department_staff.token
    const body = { role: 'student', email: 'new.student@vsu.edu.ph', full_name: 'New Student', student_number: '26-1-00001', program_id: MOCK_IDS.programBscs, curriculum_version_id: MOCK_IDS.curriculumBscs2024 }
    const send = (payload: object) => fetch(`${BASE_URL}/functions/v1/auth/invite`, { method: 'POST', headers: { apikey: TEST_API_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    expect((await send(body)).status).toBe(400)
    expect((await send({ ...body, adviser_id: null })).status).toBe(400)
    expect((await send({ ...body, adviser_id: MOCK_IDS.studentPrimary })).status).toBe(400)
    expect(getMockDatabase().profiles.some(p => p.email === body.email)).toBe(false)
    const response = await send({ ...body, adviser_id: MOCK_IDS.adviserPrimary })
    expect(response.status).toBe(201)
    const result = await response.json() as { profile_id: string }
    expect(getMockDatabase().adviserAssignments.some(a => a.student_id === result.profile_id && a.adviser_id === MOCK_IDS.adviserPrimary && a.end_date === null)).toBe(true)
    expect(getMockDatabase().studentCurriculumAssignments.some(a => a.student_id === result.profile_id)).toBe(true)
  })

  it('restricts adviser reassignment to department Head and Staff scope', async () => {
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const body = { adviser_id: MOCK_IDS.adviserSecondary, start_date: '2026-11-10', reason: 'Caseload change' }
    const own = { path: { student_id: MOCK_IDS.studentPrimary } }
    loginAsMockPersona('adviser')
    expect((await client.PUT('/functions/v1/students/{student_id}/adviser', { params: own, body })).response.status).toBe(403)
    loginAsMockPersona('admin')
    expect((await client.PUT('/functions/v1/students/{student_id}/adviser', { params: own, body })).response.status).toBe(403)
    loginAsMockPersona('department_staff')
    expect((await client.PUT('/functions/v1/students/{student_id}/adviser', { params: own, body })).response.status).toBe(200)
    const other = { path: { student_id: MOCK_IDS.studentOtherDept } }
    expect((await client.PUT('/functions/v1/students/{student_id}/adviser', { params: other, body })).response.status).toBe(403)
  })

  it('retains student visibility of archived notes', async () => {
    const db = getMockDatabase()
    const own = db.advisingNotes.find(n => n.student_id === MOCK_IDS.studentPrimary)!
    own.is_archived = true
    loginAsMockPersona('student')
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const notes = unwrapApiResult(await client.GET('/rest/v1/advising_note'))
    expect(notes.some(n => n.id === own.id && n.is_archived)).toBe(true)
    expect(notes.every(n => n.student_id === MOCK_IDS.studentPrimary)).toBe(true)
  })

  it('blocks department grade writes until the closure is reopened', async () => {
    loginAsMockPersona('department_staff')
    const client = createSaaisApiClient({ baseUrl: BASE_URL, apiKey: TEST_API_KEY, mode: 'mock' })
    const path = { school_term_id: MOCK_IDS.term2026Sem1Open }
    expect((await client.POST('/functions/v1/school-terms/{school_term_id}/close-encoding', { params: { path }, body: { scope: 'department' } })).response.status).toBe(200)
    loginAsMockPersona('adviser')
    const body = { school_term_id: path.school_term_id, course_offering_id: MOCK_IDS.offeringCsci153, confirmed_enrollment: true, continue_with_prerequisite_override: false }
    const params = { path: { student_id: MOCK_IDS.studentPrimary } }
    expect((await client.POST('/functions/v1/students/{student_id}/record-grades', { params, body })).response.status).toBe(409)
    loginAsMockPersona('department_staff')
    expect((await client.POST('/functions/v1/school-terms/{school_term_id}/reopen-encoding', { params: { path }, body: { scope: 'department' } })).response.status).toBe(200)
    loginAsMockPersona('adviser')
    expect((await client.POST('/functions/v1/students/{student_id}/record-grades', { params, body })).response.status).toBe(200)
  })

  it('resolves named and shorthand mock persona tokens accurately', () => {
    expect(
      resolveMockPersonaFromAuthHeader(`Bearer ${MOCK_PERSONAS.adviser.token}`)
        ?.key,
    ).toBe('adviser')
    expect(
      resolveMockPersonaFromAuthHeader('Bearer mock-jwt:dean_dept_head')?.key,
    ).toBe('dean_dept_head')
    expect(resolveMockPersonaFromAuthHeader('Bearer admin-jwt')?.key).toBe(
      'admin',
    )
    expect(MOCK_PERSONAS.admin.email).toBe('23-1-01457@vsu.edu.ph')
    expect(MOCK_PERSONAS.admin.fullName).toBe('Lelis, Nietzchan Jake')
    expect(MOCK_PERSONAS.admin.roles).toEqual(['admin', 'adviser'])
    expect(Object.keys(MOCK_PERSONAS)).toHaveLength(10)
    expect(resolveMockPersonaFromAuthHeader(null)).toBeNull()
  })

  it('handles pre-session invitation preview, verify (12-128 char policy), and decline without Bearer token', async () => {
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    const preview = unwrapApiResult(
      await client.POST('/functions/v1/auth/preview-invite', {
        body: { token: 'valid-single-use-invite-token' },
      }),
    )
    expect(preview.valid).toBe(true)
    expect(preview.role).toBe('student')
    expect(preview.program_code).toBe('BSCS')

    // Rejects short (<12 char) password per contract policy
    const weakVerify = await client.POST('/functions/v1/auth/verify-invite', {
      body: { token: 'valid-single-use-invite-token', password: 'short' },
    })
    expect(weakVerify.response.status).toBe(400)

    const verify = unwrapApiResult(
      await client.POST('/functions/v1/auth/verify-invite', {
        body: {
          token: 'valid-single-use-invite-token',
          password: 'ValidStrongPassword2026!',
        },
      }),
    )
    expect(verify.success).toBe(true)

    const decline = unwrapApiResult(
      await client.POST('/functions/v1/auth/decline-invite', {
        body: { token: 'valid-single-use-invite-token', reason: 'Declined' },
      }),
    )
    expect(decline.invitation_status).toBe('declined')
  })

  it('enforces Student self-only access on PostgREST projections and student Edge Functions', async () => {
    loginAsMockPersona('student')
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    // Own profile, adviser assignment, and academic summary succeed
    const profiles = unwrapApiResult(await client.GET('/rest/v1/profile'))
    expect(profiles).toHaveLength(1)
    expect(profiles[0]?.id).toBe(MOCK_IDS.studentPrimary)

    const assignments = unwrapApiResult(
      await client.GET('/rest/v1/adviser_assignment', {
        params: {
          query: {
            select:
              'id,adviser_id,adviser_name,adviser_email,adviser_faculty_name,adviser_consultation_hours,student_id,start_date',
            student_id: postgrestFilter.eq(MOCK_IDS.studentPrimary),
          },
        },
      }),
    )
    expect(assignments[0]?.adviser_name).toBe(MOCK_PERSONAS.adviser.fullName)
    expect(assignments[0]?.adviser_consultation_hours).toBeTruthy()

    const ownSummary = unwrapApiResult(
      await client.GET('/functions/v1/students/{student_id}/academic-summary', {
        params: { path: { student_id: MOCK_IDS.studentPrimary } },
      }),
    )
    expect(ownSummary.student_id).toBe(MOCK_IDS.studentPrimary)

    // Reading another student's academic summary or checklist is denied with 403
    const otherSummary = await client.GET(
      '/functions/v1/students/{student_id}/academic-summary',
      {
        params: { path: { student_id: MOCK_IDS.studentSecondary } },
      },
    )
    expect(otherSummary.response.status).toBe(403)

    // Student cannot call staff roster or account invite
    const rosterAttempt = await client.GET('/functions/v1/students')
    expect(rosterAttempt.response.status).toBe(403)
  })

  it('enforces Department Staff provisioning boundaries', async () => {
    loginAsMockPersona('department_staff')
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    // Allowed: inviting a department head within DCST
    const allowedInvite = unwrapApiResult(
      await client.POST('/functions/v1/auth/invite', {
        body: {
          role: 'department_head',
          email: 'new.adviser.mock@vsu.edu.ph',
          full_name: 'Prof. New Adviser',
          faculty_id: MOCK_IDS.facultyComputing,
          department_id: MOCK_IDS.deptDcst,
        },
      }),
    )
    expect(allowedInvite.success).toBe(true)
    expect(allowedInvite.invitation_status).toBe('pending')

    for (const operation of ['resend-invite', 'revoke-invite'] as const) {
      const response = await fetch(`${BASE_URL}/functions/v1/accounts/${allowedInvite.profile_id}/${operation}`, {
        method: 'POST', headers: { apikey: TEST_API_KEY, Authorization: `Bearer ${MOCK_PERSONAS.department_staff.token}` },
      })
      expect(response.status).toBe(200)
    }

    // Denied: Department Staff attempting to provision an Admin or Dean
    const deniedAdminInvite = await client.POST('/functions/v1/auth/invite', {
      body: {
        role: 'admin',
        email: 'rogue.admin@vsu.edu.ph',
        full_name: 'Rogue Admin',
      },
    })
    expect(deniedAdminInvite.response.status).toBe(403)
    const deniedDean = await client.POST('/functions/v1/auth/invite', {
      body: { role: 'dean', email: 'rogue.dean@vsu.edu.ph', full_name: 'Rogue Dean' },
    })
    expect(deniedDean.response.status).toBe(403)

    // Denied: Department Staff attempting to provision in another department
    const crossDeptInvite = await client.POST('/functions/v1/auth/invite', {
      body: {
        role: 'department_head',
        email: 'cross.dept@vsu.edu.ph',
        full_name: 'Cross Dept Adviser',
        faculty_id: MOCK_IDS.facultyEngineering,
        department_id: MOCK_IDS.deptDabe,
      },
    })
    expect(crossDeptInvite.response.status).toBe(403)
  })

  it('supports Adviser workflows including 409 ENROLLMENT_CONFIRMATION_REQUIRED, recommendations, and plan saving', async () => {
    loginAsMockPersona('adviser')
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    const roster = unwrapApiResult(
      await client.GET('/functions/v1/students', {
        params: { query: { assignment_scope: 'current' } },
      }),
    )
    expect(roster.total_count).toBe(1)
    expect(roster.items[0]?.student_number).toBe('24-1-01798')

    const recsResponse = await client.GET(
      '/functions/v1/students/{student_id}/recommendations',
      {
        params: {
          path: { student_id: MOCK_IDS.studentPrimary },
          query: { school_term_id: MOCK_IDS.term2026Sem1Open },
        },
      },
    )
    expect(recsResponse.response.headers.get('X-Excluded-Count')).toBe('3')
    const recs = unwrapApiResult(recsResponse)
    expect(recs[0]?.excluded_summary?.total_excluded).toBe(3)

    // Recording midterm grade without confirmed_enrollment returns 409 ENROLLMENT_CONFIRMATION_REQUIRED
    const unconfirmed = await client.POST(
      '/functions/v1/students/{student_id}/record-grades',
      {
        params: { path: { student_id: MOCK_IDS.studentPrimary } },
        body: {
          school_term_id: MOCK_IDS.term2026Sem1Open,
          course_offering_id: MOCK_IDS.offeringCsci198,
          curriculum_term_course_id: MOCK_IDS.slotFreeElective1,
          midterm_grade: 1.5,
          confirmed_enrollment: false,
          continue_with_prerequisite_override: false,
        },
      },
    )
    expect(unconfirmed.response.status).toBe(409)
    try {
      unwrapApiResult(unconfirmed)
    } catch (err) {
      expect(isApiClientError(err)).toBe(true)
      expect(
        hasApiErrorCode(err, API_ERROR_CODES.ENROLLMENT_CONFIRMATION_REQUIRED),
      ).toBe(true)
    }

    // Re-submitting with confirmed_enrollment: true succeeds
    const confirmed = unwrapApiResult(
      await client.POST('/functions/v1/students/{student_id}/record-grades', {
        params: { path: { student_id: MOCK_IDS.studentPrimary } },
        body: {
          school_term_id: MOCK_IDS.term2026Sem1Open,
          course_offering_id: MOCK_IDS.offeringCsci198,
          curriculum_term_course_id: MOCK_IDS.slotFreeElective1,
          midterm_grade: 1.5,
          confirmed_enrollment: true,
          continue_with_prerequisite_override: false,
        },
      }),
    )
    expect(confirmed.midterm_grade).toBe(1.5)
    expect(confirmed.curriculum_term_course_id).toBe(MOCK_IDS.slotFreeElective1)
  })

  it('supports Department Head, Dean, and Admin catalog/reporting/audit flows and resets state cleanly', async () => {
    loginAsMockPersona('department_head')
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    // Department Head can close department encoding, but not institution-wide encoding
    const deptClose = unwrapApiResult(
      await client.POST(
        '/functions/v1/school-terms/{school_term_id}/close-encoding',
        {
          params: { path: { school_term_id: MOCK_IDS.term2026Sem1Open } },
          body: { scope: 'department', department_id: MOCK_IDS.deptDcst },
        },
      ),
    )
    expect(deptClose.department_closures?.[0]?.is_closed).toBe(true)

    const instCloseForbidden = await client.POST(
      '/functions/v1/school-terms/{school_term_id}/close-encoding',
      {
        params: { path: { school_term_id: MOCK_IDS.term2026Sem1Open } },
        body: { scope: 'institution' },
      },
    )
    expect(instCloseForbidden.response.status).toBe(403)

    // Switch to Admin and verify 409 dependency guard on faculty deletion + unreferenced faculty deletion
    loginAsMockPersona('admin')
    const deleteReferencedFaculty = await client.DELETE(
      '/functions/v1/catalog/faculty/{id}',
      {
        params: { path: { id: MOCK_IDS.facultyComputing } },
      },
    )
    expect(deleteReferencedFaculty.response.status).toBe(409)

    const createdFaculty = unwrapApiResult(
      await client.POST('/functions/v1/catalog/faculty', {
        body: { code: 'FVM', name: 'Faculty of Veterinary Medicine' },
      }),
    )
    expect(getMockDatabase().faculties).toHaveLength(4)

    const deleteNewFaculty = await client.DELETE(
      '/functions/v1/catalog/faculty/{id}',
      {
        params: { path: { id: createdFaculty.id } },
      },
    )
    expect(deleteNewFaculty.response.status).toBe(204)
    expect(getMockDatabase().faculties).toHaveLength(3)

    // Audit log closed date-range filter and Content-Range header
    const auditRes = await client.GET('/rest/v1/audit_log_entry', {
      params: {
        query: {
          and: postgrestFilter.createdAtBetween(
            '2026-08-01T00:00:00Z',
            '2026-12-31T23:59:59Z',
          ),
          limit: 20,
        },
      },
    })
    const auditRows = unwrapApiResult(auditRes)
    expect(auditRows.length).toBeGreaterThanOrEqual(2)
    expect(
      parseContentRange(auditRes.response.headers.get('Content-Range'))?.total,
    ).toBe(2)

    // Resetting restores initial database state
    resetMockDatabase()
    expect(getMockDatabase().faculties).toHaveLength(3)
  })
})
