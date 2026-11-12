import type { Session } from '@supabase/supabase-js'
import type { ApiSchema } from '@/lib/api'
import { setMockSessionToken } from '@/lib/api/auth-token'
import {
  MOCK_IDS,
  MOCK_PERSONAS,
  type MockPersona,
  type MockPersonaKey,
  type SaaisRole,
  loginAsMockPersona,
  logoutMockPersona,
} from '@/mocks/personas'
import { getMockDatabase } from '@/mocks/store'

export type SyntheticPersonaKey =
  | MockPersonaKey
  | 'dean_only'
  | 'department_head_only'
  | 'disabled_account'
  | 'invited_adviser'

export interface SyntheticPersonaDescriptor {
  readonly key: SyntheticPersonaKey
  readonly profileId: string
  readonly email: string
  readonly fullName: string
  readonly primaryRole: SaaisRole
  readonly roles: readonly SaaisRole[]
  readonly facultyId: string | null
  readonly departmentId: string | null
  readonly status: ApiSchema<'ProfileStatus'>
  readonly token: string
  readonly authProvider?: 'password' | 'google'
}

export const SYNTHETIC_DEAN_ONLY_ID = '00000000-0000-4000-8000-000000000503'
export const SYNTHETIC_DEPT_HEAD_ONLY_ID = '00000000-0000-4000-8000-000000000504'
export const SYNTHETIC_DISABLED_ID = '00000000-0000-4000-8000-000000000199'
export const SYNTHETIC_INVITED_ADVISER_ID = '00000000-0000-4000-8000-000000000299'

function buildDescriptorFromMockPersona(
  persona: MockPersona,
): SyntheticPersonaDescriptor {
  const db = getMockDatabase()
  const dbProfile = db.profiles.find((p) => p.id === persona.profileId)
  return {
    key: persona.key,
    profileId: persona.profileId,
    email: persona.email,
    fullName: persona.fullName,
    primaryRole: persona.primaryRole,
    roles: dbProfile?.roles ?? persona.roles,
    facultyId: persona.facultyId,
    departmentId: persona.departmentId,
    status: dbProfile?.status ?? 'active',
    token: persona.token,
    authProvider: 'password',
  }
}

export function getSyntheticPersonas(): Readonly<
  Record<SyntheticPersonaKey, SyntheticPersonaDescriptor>
> {
  const base = Object.fromEntries(
    (Object.keys(MOCK_PERSONAS) as MockPersonaKey[]).map((key) => [
      key,
      buildDescriptorFromMockPersona(MOCK_PERSONAS[key]),
    ]),
  ) as Record<MockPersonaKey, SyntheticPersonaDescriptor>

  return {
    ...base,
    dean_only: {
      key: 'dean_only',
      profileId: SYNTHETIC_DEAN_ONLY_ID,
      email: 'dean.computing@vsu.edu.ph',
      fullName: 'Dean of Computing (Dean-Only)',
      primaryRole: 'dean',
      roles: ['dean'],
      facultyId: MOCK_IDS.facultyComputing,
      departmentId: null,
      status: 'active',
      token: `mock-jwt:dean:${SYNTHETIC_DEAN_ONLY_ID}`,
      authProvider: 'password',
    },
    department_head_only: {
      key: 'department_head_only',
      profileId: SYNTHETIC_DEPT_HEAD_ONLY_ID,
      email: 'head.dcst@vsu.edu.ph',
      fullName: 'Department Head of DCST (Dept-Head-Only)',
      primaryRole: 'department_head',
      roles: ['department_head'],
      facultyId: MOCK_IDS.facultyComputing,
      departmentId: MOCK_IDS.deptDcst,
      status: 'active',
      token: `mock-jwt:department_head:${SYNTHETIC_DEPT_HEAD_ONLY_ID}`,
      authProvider: 'password',
    },
    disabled_account: {
      key: 'disabled_account',
      profileId: SYNTHETIC_DISABLED_ID,
      email: 'inactive.user@vsu.edu.ph',
      fullName: 'Deactivated Account (Inactive)',
      primaryRole: 'student',
      roles: ['student'],
      facultyId: MOCK_IDS.facultyComputing,
      departmentId: MOCK_IDS.deptDcst,
      status: 'disabled',
      token: `mock-jwt:student:${SYNTHETIC_DISABLED_ID}`,
      authProvider: 'password',
    },
    invited_adviser: {
      key: 'invited_adviser',
      profileId: SYNTHETIC_INVITED_ADVISER_ID,
      email: 'pending.adviser@vsu.edu.ph',
      fullName: 'Pending Adviser (Invited)',
      primaryRole: 'adviser',
      roles: ['adviser'],
      facultyId: MOCK_IDS.facultyComputing,
      departmentId: MOCK_IDS.deptDcst,
      status: 'invited',
      token: `mock-jwt:adviser:${SYNTHETIC_INVITED_ADVISER_ID}`,
      authProvider: 'password',
    },
  }
}

export function ensureSyntheticProfilesInMockStore(): void {
  const db = getMockDatabase()

  if (!db.profiles.some((p) => p.id === SYNTHETIC_DEAN_ONLY_ID)) {
    db.profiles.push({
      id: SYNTHETIC_DEAN_ONLY_ID,
      role: 'dean',
      roles: ['dean'],
      email: 'dean.computing@vsu.edu.ph',
      full_name: 'Dean of Computing (Dean-Only)',
      student_number: null,
      status: 'active',
      invitation_status: 'accepted',
      invitation_sent_at: '2026-07-01T08:00:00Z',
      invitation_expires_at: '2026-07-08T08:00:00Z',
      created_at: '2026-07-01T08:00:00Z',
      updated_at: '2026-07-01T08:00:00Z',
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: null,
      avatar_url: null,
      consultation_hours: null,
    })
    db.roleAssignments.push({
      id: '92000000-0000-4000-8000-000000000098',
      profile_id: SYNTHETIC_DEAN_ONLY_ID,
      role: 'dean',
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: null,
      created_at: '2026-07-01T08:00:00Z',
    })
  }

  if (!db.profiles.some((p) => p.id === SYNTHETIC_DEPT_HEAD_ONLY_ID)) {
    db.profiles.push({
      id: SYNTHETIC_DEPT_HEAD_ONLY_ID,
      role: 'department_head',
      roles: ['department_head'],
      email: 'head.dcst@vsu.edu.ph',
      full_name: 'Department Head of DCST (Dept-Head-Only)',
      student_number: null,
      status: 'active',
      invitation_status: 'accepted',
      invitation_sent_at: '2026-07-01T08:00:00Z',
      invitation_expires_at: '2026-07-08T08:00:00Z',
      created_at: '2026-07-01T08:00:00Z',
      updated_at: '2026-07-01T08:00:00Z',
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: MOCK_IDS.deptDcst,
      avatar_url: null,
      consultation_hours: null,
    })
    db.roleAssignments.push({
      id: '92000000-0000-4000-8000-000000000099',
      profile_id: SYNTHETIC_DEPT_HEAD_ONLY_ID,
      role: 'department_head',
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: MOCK_IDS.deptDcst,
      created_at: '2026-07-01T08:00:00Z',
    })
  }

  if (!db.profiles.some((p) => p.id === SYNTHETIC_INVITED_ADVISER_ID)) {
    db.profiles.push({
      id: SYNTHETIC_INVITED_ADVISER_ID,
      role: 'adviser',
      roles: ['adviser'],
      email: 'pending.adviser@vsu.edu.ph',
      full_name: 'Pending Adviser (Invited)',
      student_number: null,
      status: 'invited',
      invitation_status: 'pending',
      invitation_sent_at: '2026-08-01T08:00:00Z',
      invitation_expires_at: '2026-12-31T23:59:59Z',
      created_at: '2026-08-01T08:00:00Z',
      updated_at: '2026-08-01T08:00:00Z',
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: MOCK_IDS.deptDcst,
      avatar_url: null,
      consultation_hours: null,
    })
    db.roleAssignments.push({
      id: '92000000-0000-4000-8000-000000000100',
      profile_id: SYNTHETIC_INVITED_ADVISER_ID,
      role: 'adviser',
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: MOCK_IDS.deptDcst,
      created_at: '2026-08-01T08:00:00Z',
    })
  }

  if (!db.profiles.some((p) => p.id === SYNTHETIC_DISABLED_ID)) {
    db.profiles.push({
      id: SYNTHETIC_DISABLED_ID,
      role: 'student',
      roles: ['student'],
      email: 'inactive.user@vsu.edu.ph',
      full_name: 'Deactivated Account (Inactive)',
      student_number: '22-1-09999',
      status: 'disabled',
      invitation_status: 'accepted',
      invitation_sent_at: '2026-07-01T08:00:00Z',
      invitation_expires_at: '2026-07-08T08:00:00Z',
      created_at: '2026-07-01T08:00:00Z',
      updated_at: '2026-07-01T08:00:00Z',
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: MOCK_IDS.deptDcst,
      avatar_url: null,
      consultation_hours: null,
    })
    db.roleAssignments.push({
      id: '92000000-0000-4000-8000-000000000099',
      profile_id: SYNTHETIC_DISABLED_ID,
      role: 'student',
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: MOCK_IDS.deptDcst,
      created_at: '2026-07-01T08:00:00Z',
    })
  }
}

export function buildMockSession(
  descriptor: SyntheticPersonaDescriptor,
  provider: 'password' | 'google' = descriptor.authProvider ?? 'password',
): Session {
  return {
    access_token: descriptor.token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `mock-refresh:${descriptor.key}`,
    user: {
      id: descriptor.profileId,
      email: descriptor.email,
      user_metadata: { full_name: descriptor.fullName },
      app_metadata: {
        provider: provider === 'google' ? 'google' : 'email',
        providers: provider === 'google' ? ['google'] : ['email'],
        roles: descriptor.roles,
      },
      aud: 'authenticated',
      created_at: '2026-08-01T08:00:00Z',
    },
  } as unknown as Session
}

export function activateMockPersonaSession(
  personaKey: SyntheticPersonaKey,
  provider: 'password' | 'google' = 'password',
): {
  descriptor: SyntheticPersonaDescriptor
  session: Session
  profile: ApiSchema<'Profile'>
  roleAssignments: ApiSchema<'RoleAssignment'>[]
} {
  ensureSyntheticProfilesInMockStore()
  const personas = getSyntheticPersonas()
  const descriptor = personas[personaKey]
  if (!descriptor) {
    throw new Error(`Unknown synthetic persona key: ${personaKey}`)
  }

  if (personaKey in MOCK_PERSONAS) {
    loginAsMockPersona(personaKey as MockPersonaKey)
  } else {
    setMockSessionToken(descriptor.token)
  }

  const db = getMockDatabase()
  let dbProfile = db.profiles.find((p) => p.id === descriptor.profileId)

  // Per contract/SUPABASE-AUTH.md: Google OAuth on a pre-registered 'invited' profile
  // transitions Profile.status to 'active' and invitation_status to 'accepted'.
  if (dbProfile && provider === 'google' && dbProfile.status === 'invited') {
    const updatedProfile: ApiSchema<'Profile'> = {
      ...dbProfile,
      status: 'active',
      invitation_status: 'accepted',
    }
    db.profiles = db.profiles.map((p) =>
      p.id === descriptor.profileId ? updatedProfile : p,
    )
    dbProfile = updatedProfile
  }

  const profile: ApiSchema<'Profile'> = dbProfile ?? {
    id: descriptor.profileId,
    role: descriptor.primaryRole,
    roles: [...descriptor.roles],
    email: descriptor.email,
    full_name: descriptor.fullName,
    student_number: null,
    status: descriptor.status,
    invitation_status: 'accepted',
    invitation_sent_at: '2026-08-01T08:00:00Z',
    invitation_expires_at: '2026-08-08T08:00:00Z',
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
    faculty_id: descriptor.facultyId,
    department_id: descriptor.departmentId,
    avatar_url: null,
    consultation_hours: null,
  }

  const roleAssignments = db.roleAssignments.filter(
    (r) => r.profile_id === descriptor.profileId,
  )

  const existingRoleSet = new Set(roleAssignments.map((r) => r.role))
  const missingAssignments: ApiSchema<'RoleAssignment'>[] = descriptor.roles
    .filter((role) => !existingRoleSet.has(role))
    .map((role, index) => ({
      id: `synthetic-role-${descriptor.profileId}-${index}`,
      profile_id: descriptor.profileId,
      role,
      faculty_id: descriptor.facultyId,
      department_id: descriptor.departmentId,
      created_at: '2026-08-01T08:00:00Z',
    }))

  const effectiveAssignments: ApiSchema<'RoleAssignment'>[] = [
    ...roleAssignments,
    ...missingAssignments,
  ]

  const updatedDescriptor: SyntheticPersonaDescriptor = {
    ...descriptor,
    status: profile.status,
    authProvider: provider,
  }

  return {
    descriptor: updatedDescriptor,
    session: buildMockSession(updatedDescriptor, provider),
    profile,
    roleAssignments: effectiveAssignments,
  }
}

export function clearMockPersonaSession(): void {
  logoutMockPersona()
}

export function findSyntheticPersonaByEmail(
  email: string,
): SyntheticPersonaDescriptor | null {
  ensureSyntheticProfilesInMockStore()
  const normalized = email.trim().toLowerCase()
  const personas = Object.values(getSyntheticPersonas())
  return (
    personas.find(
      (p) =>
        p.email.toLowerCase() === normalized ||
        p.key.toLowerCase() === normalized,
    ) ?? null
  )
}
