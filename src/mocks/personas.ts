import { setMockSessionToken } from '@/lib/api/auth-token'
import type { ApiSchema } from '@/lib/api/types'

export type SaaisRole = ApiSchema<'RoleType'>
export type SaaisScopeType = 'institution' | 'faculty' | 'department'

/**
 * Deterministic synthetic UUIDs for mock faculties, departments, programs,
 * curricula, school terms, courses, and user profiles.
 * Contains zero real student or staff data.
 */
export const MOCK_IDS = {
  facultyComputing: '10000000-0000-4000-8000-000000000001',
  facultyEngineering: '10000000-0000-4000-8000-000000000002',

  deptDcst: '20000000-0000-4000-8000-000000000001',
  deptDabe: '20000000-0000-4000-8000-000000000002',

  programBscs: '30000000-0000-4000-8000-000000000001',
  programBsit: '30000000-0000-4000-8000-000000000002',

  curriculumBscs2024: '40000000-0000-4000-8000-000000000001',
  curriculumBscs2020: '40000000-0000-4000-8000-000000000002',

  curriculumTerm1Y1S: '41000000-0000-4000-8000-000000000001',
  curriculumTerm1Y2S: '41000000-0000-4000-8000-000000000002',
  curriculumTerm3Y1S: '41000000-0000-4000-8000-000000000003',

  slotCsci101: '42000000-0000-4000-8000-000000000001',
  slotCsci102: '42000000-0000-4000-8000-000000000002',
  slotCsci153: '42000000-0000-4000-8000-000000000003',
  slotFreeElective1: '42000000-0000-4000-8000-000000000004',
  slotPe1: '42000000-0000-4000-8000-000000000005',
  slotNstp1: '42000000-0000-4000-8000-000000000006',

  courseCsci101: '50000000-0000-4000-8000-000000000001',
  courseCsci102: '50000000-0000-4000-8000-000000000002',
  courseCsci153: '50000000-0000-4000-8000-000000000003',
  courseCsci198: '50000000-0000-4000-8000-000000000004',
  coursePhEd11: '50000000-0000-4000-8000-000000000005',
  courseNstp11: '50000000-0000-4000-8000-000000000006',

  prereqCsci102Requires101: '51000000-0000-4000-8000-000000000001',
  prereqCsci153Requires102: '51000000-0000-4000-8000-000000000002',

  pairEquiv1: '52000000-0000-4000-8000-000000000001',

  term2025Sem2Closed: '60000000-0000-4000-8000-000000000001',
  term2026Sem1Open: '60000000-0000-4000-8000-000000000002',

  deptEncodingDcstOpen: '61000000-0000-4000-8000-000000000001',

  offeringCsci153: '62000000-0000-4000-8000-000000000001',
  offeringCsci198: '62000000-0000-4000-8000-000000000002',
  offeringCsci102: '62000000-0000-4000-8000-000000000003',

  studentPrimary: '00000000-0000-4000-8000-000000000101',
  studentSecondary: '00000000-0000-4000-8000-000000000102',
  studentOtherDept: '00000000-0000-4000-8000-000000000103',
  adviserPrimary: '00000000-0000-4000-8000-000000000201',
  adviserSecondary: '00000000-0000-4000-8000-000000000202',
  deptHeadDcst: '00000000-0000-4000-8000-000000000301',
  deptStaffDcst: '00000000-0000-4000-8000-000000000401',
  deanComputing: '00000000-0000-4000-8000-000000000501',
  deanDeptHeadComputing: '00000000-0000-4000-8000-000000000502',
  systemAdmin: '00000000-0000-4000-8000-000000000601',

  adviserAssignment1: '70000000-0000-4000-8000-000000000001',
  adviserAssignment2: '70000000-0000-4000-8000-000000000002',
  studentCurrAssignment1: '71000000-0000-4000-8000-000000000001',
  studentCurrAssignment2: '71000000-0000-4000-8000-000000000002',

  attemptCsci101Passed: '80000000-0000-4000-8000-000000000001',
  attemptCsci102Inc: '80000000-0000-4000-8000-000000000002',
  attemptCsci153Open: '80000000-0000-4000-8000-000000000003',

  incResolution1: '81000000-0000-4000-8000-000000000001',
  electiveMapping1: '82000000-0000-4000-8000-000000000001',
  equivalencyDecision1: '83000000-0000-4000-8000-000000000001',
  outsideCredit1: '84000000-0000-4000-8000-000000000001',
  transferRequest1: '85000000-0000-4000-8000-000000000001',

  advisingPlan1: '86000000-0000-4000-8000-000000000001',
  advisingPlanItem1: '86100000-0000-4000-8000-000000000001',
  advisingNote1: '87000000-0000-4000-8000-000000000001',
  attemptRemark1: '88000000-0000-4000-8000-000000000001',
  gradeFlag1: '89000000-0000-4000-8000-000000000001',

  notification1: '90000000-0000-4000-8000-000000000001',
  auditLog1: '91000000-0000-4000-8000-000000000001',
  auditLog2: '91000000-0000-4000-8000-000000000002',
} as const

export type MockPersonaKey =
  | 'student'
  | 'student_secondary'
  | 'student_other_dept'
  | 'adviser'
  | 'department_head'
  | 'department_staff'
  | 'dean'
  | 'dean_dept_head'
  | 'admin'

export interface MockRoleScope {
  readonly role: SaaisRole
  readonly scope_type: SaaisScopeType
  readonly scope_id: string | null
}

export interface MockPersona {
  readonly key: MockPersonaKey
  readonly profileId: string
  readonly email: string
  readonly fullName: string
  readonly primaryRole: SaaisRole
  readonly roles: readonly SaaisRole[]
  readonly roleScopes: readonly MockRoleScope[]
  readonly facultyId: string | null
  readonly departmentId: string | null
  readonly token: string
}

export const MOCK_PERSONAS: Readonly<Record<MockPersonaKey, MockPersona>> = {
  student: {
    key: 'student',
    profileId: MOCK_IDS.studentPrimary,
    email: 'juan.delacruz.mock@vsu.edu.ph',
    fullName: 'Juan M. Dela Cruz',
    primaryRole: 'student',
    roles: ['student'],
    roleScopes: [
      {
        role: 'student',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
    ],
    facultyId: MOCK_IDS.facultyComputing,
    departmentId: MOCK_IDS.deptDcst,
    token: `mock-jwt:student:${MOCK_IDS.studentPrimary}`,
  },
  student_secondary: {
    key: 'student_secondary',
    profileId: MOCK_IDS.studentSecondary,
    email: 'maria.santos.mock@vsu.edu.ph',
    fullName: 'Maria L. Santos',
    primaryRole: 'student',
    roles: ['student'],
    roleScopes: [
      {
        role: 'student',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
    ],
    facultyId: MOCK_IDS.facultyComputing,
    departmentId: MOCK_IDS.deptDcst,
    token: `mock-jwt:student_secondary:${MOCK_IDS.studentSecondary}`,
  },
  student_other_dept: {
    key: 'student_other_dept',
    profileId: MOCK_IDS.studentOtherDept,
    email: 'pedro.penduko.mock@vsu.edu.ph',
    fullName: 'Pedro R. Penduko',
    primaryRole: 'student',
    roles: ['student'],
    roleScopes: [
      {
        role: 'student',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDabe,
      },
    ],
    facultyId: MOCK_IDS.facultyEngineering,
    departmentId: MOCK_IDS.deptDabe,
    token: `mock-jwt:student_other_dept:${MOCK_IDS.studentOtherDept}`,
  },
  adviser: {
    key: 'adviser',
    profileId: MOCK_IDS.adviserPrimary,
    email: 'clara.adviser.mock@vsu.edu.ph',
    fullName: 'Prof. Maria Clara Santos',
    primaryRole: 'adviser',
    roles: ['adviser'],
    roleScopes: [
      {
        role: 'adviser',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
    ],
    facultyId: MOCK_IDS.facultyComputing,
    departmentId: MOCK_IDS.deptDcst,
    token: `mock-jwt:adviser:${MOCK_IDS.adviserPrimary}`,
  },
  department_head: {
    key: 'department_head',
    profileId: MOCK_IDS.deptHeadDcst,
    email: 'jose.depthead.mock@vsu.edu.ph',
    fullName: 'Dr. Jose Rizalino Gomez',
    primaryRole: 'department_head',
    roles: ['department_head', 'adviser'],
    roleScopes: [
      {
        role: 'department_head',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
      {
        role: 'adviser',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
    ],
    facultyId: MOCK_IDS.facultyComputing,
    departmentId: MOCK_IDS.deptDcst,
    token: `mock-jwt:department_head:${MOCK_IDS.deptHeadDcst}`,
  },
  department_staff: {
    key: 'department_staff',
    profileId: MOCK_IDS.deptStaffDcst,
    email: 'andres.staff.mock@vsu.edu.ph',
    fullName: 'Engr. Andres Bonifacio',
    primaryRole: 'department_staff',
    roles: ['department_staff'],
    roleScopes: [
      {
        role: 'department_staff',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
    ],
    facultyId: MOCK_IDS.facultyComputing,
    departmentId: MOCK_IDS.deptDcst,
    token: `mock-jwt:department_staff:${MOCK_IDS.deptStaffDcst}`,
  },
  dean: {
    key: 'dean',
    profileId: MOCK_IDS.deanComputing,
    email: 'gabriela.dean.mock@vsu.edu.ph',
    fullName: 'Dr. Gabriela Silang',
    primaryRole: 'dean',
    roles: ['dean', 'adviser'],
    roleScopes: [
      {
        role: 'dean',
        scope_type: 'faculty',
        scope_id: MOCK_IDS.facultyComputing,
      },
      {
        role: 'adviser',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
    ],
    facultyId: MOCK_IDS.facultyComputing,
    departmentId: MOCK_IDS.deptDcst,
    token: `mock-jwt:dean:${MOCK_IDS.deanComputing}`,
  },
  dean_dept_head: {
    key: 'dean_dept_head',
    profileId: MOCK_IDS.deanDeptHeadComputing,
    email: 'apolinario.deandh.mock@vsu.edu.ph',
    fullName: 'Dr. Apolinario Mabini',
    primaryRole: 'dean',
    roles: ['dean', 'department_head', 'adviser'],
    roleScopes: [
      {
        role: 'dean',
        scope_type: 'faculty',
        scope_id: MOCK_IDS.facultyComputing,
      },
      {
        role: 'department_head',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
      {
        role: 'adviser',
        scope_type: 'department',
        scope_id: MOCK_IDS.deptDcst,
      },
    ],
    facultyId: MOCK_IDS.facultyComputing,
    departmentId: MOCK_IDS.deptDcst,
    token: `mock-jwt:dean_dept_head:${MOCK_IDS.deanDeptHeadComputing}`,
  },
  admin: {
    key: 'admin',
    profileId: MOCK_IDS.systemAdmin,
    email: 'sysadmin.mock@vsu.edu.ph',
    fullName: 'SAAIS System Administrator',
    primaryRole: 'admin',
    roles: ['admin'],
    roleScopes: [
      {
        role: 'admin',
        scope_type: 'institution',
        scope_id: null,
      },
    ],
    facultyId: null,
    departmentId: null,
    token: `mock-jwt:admin:${MOCK_IDS.systemAdmin}`,
  },
}

const VALID_ROLES: ReadonlySet<string> = new Set([
  'student',
  'adviser',
  'department_head',
  'department_staff',
  'dean',
  'admin',
])

/**
 * Switches the active in-memory mock session token to the requested persona.
 */
export function loginAsMockPersona(personaKey: MockPersonaKey): MockPersona {
  const persona = MOCK_PERSONAS[personaKey]
  setMockSessionToken(persona.token)
  return persona
}

/**
 * Clears the active in-memory mock session token.
 */
export function logoutMockPersona(): void {
  setMockSessionToken(null)
}

/**
 * Resolves a `MockPersona` from an HTTP `Authorization: Bearer <token>` header.
 * Supports:
 * - Named persona tokens (`mock-jwt:adviser:<uuid>`, `mock-jwt:dean_dept_head:<uuid>`, etc.)
 * - Shorthand role tokens (`mock-jwt:<role>` or `Bearer <role>-jwt`) for test convenience
 */
export function resolveMockPersonaFromAuthHeader(
  authHeader: string | null | undefined,
): MockPersona | null {
  if (!authHeader) return null
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  if (!match || !match[1]) return null
  const rawToken = match[1].trim()
  if (!rawToken) return null

  for (const persona of Object.values(MOCK_PERSONAS)) {
    if (persona.token === rawToken) {
      return persona
    }
  }

  if (rawToken.startsWith('mock-jwt:')) {
    const parts = rawToken.split(':')
    const keyOrRole = parts[1] ?? ''
    const customProfileId = parts[2]?.trim()

    if (keyOrRole in MOCK_PERSONAS) {
      const base = MOCK_PERSONAS[keyOrRole as MockPersonaKey]
      return customProfileId
        ? { ...base, profileId: customProfileId, token: rawToken }
        : base
    }

    if (VALID_ROLES.has(keyOrRole)) {
      const base = MOCK_PERSONAS[keyOrRole as MockPersonaKey]
      return customProfileId
        ? { ...base, profileId: customProfileId, token: rawToken }
        : base
    }
  }

  const shorthandMatch =
    /^(student|adviser|department_head|department_staff|dean|admin)-jwt$/i.exec(
      rawToken,
    )
  if (shorthandMatch && shorthandMatch[1]) {
    const roleKey = shorthandMatch[1].toLowerCase() as MockPersonaKey
    return MOCK_PERSONAS[roleKey]
  }

  return null
}

export function hasMockRole(
  persona: MockPersona,
  allowedRoles: readonly SaaisRole[],
): boolean {
  return persona.roles.some((role) => allowedRoles.includes(role))
}

export function canAccessDepartment(
  persona: MockPersona,
  departmentId: string | null | undefined,
): boolean {
  if (!departmentId) return true
  if (persona.roles.includes('admin')) return true
  if (persona.roles.includes('dean')) {
    if (
      persona.facultyId === MOCK_IDS.facultyComputing &&
      departmentId === MOCK_IDS.deptDcst
    ) {
      return true
    }
  }
  return persona.departmentId === departmentId
}

export function canAccessFaculty(
  persona: MockPersona,
  facultyId: string | null | undefined,
): boolean {
  if (!facultyId) return true
  if (persona.roles.includes('admin')) return true
  return persona.facultyId === facultyId
}
