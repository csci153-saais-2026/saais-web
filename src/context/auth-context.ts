import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { ApiSchema } from '@/lib/api'
import type { RoleScope } from '@/lib/auth/auth-service'
import type { SyntheticPersonaKey } from '@/lib/auth/mock-auth-service'
import type { SaaisRole } from '@/mocks/personas'

export interface AuthProfile {
  readonly id: string
  readonly email: string
  readonly fullName: string
  readonly primaryRole: SaaisRole
  readonly roles: readonly SaaisRole[]
  readonly facultyId?: string | null
  readonly departmentId?: string | null
  readonly status?: ApiSchema<'ProfileStatus'>
  readonly studentNumber?: string | null
  readonly authProvider?: 'password' | 'google'
}

export interface AuthContextValue {
  readonly user: AuthProfile | null
  readonly profile: ApiSchema<'Profile'> | null
  readonly session: Session | null
  readonly roles: readonly SaaisRole[]
  readonly roleAssignments: readonly ApiSchema<'RoleAssignment'>[]
  readonly roleScopes: readonly RoleScope[]
  readonly activeRole: SaaisRole | null
  readonly primaryRole: SaaisRole | null
  readonly isLoading: boolean
  readonly isAuthenticated: boolean
  readonly isAllowedToEnter: boolean
  readonly entryBlockedReason: string | null
  readonly authError: string | null
  readonly isPasswordRecovery: boolean
  readonly keepSignedIn: boolean
  readonly isMockMode: boolean
  readonly activePersonaKey: SyntheticPersonaKey | null
  readonly signInWithPassword: (
    email: string,
    password: string,
    keepSignedIn?: boolean,
  ) => Promise<void>
  readonly signInWithGoogle: (keepSignedIn?: boolean) => Promise<void>
  readonly signOut: () => Promise<void>
  readonly retryHydration: () => Promise<void>
  readonly setActiveRole: (role: SaaisRole) => void
  readonly switchMockPersona: (key: SyntheticPersonaKey | null) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
