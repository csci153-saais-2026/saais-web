import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { ApiSchema } from '@/lib/api'
import { getMockSessionToken } from '@/lib/api/auth-token'
import {
  evaluateAccountEntryEligibility,
  fetchAuthenticatedUserBoundary,
  isInstitutionalEmail,
} from '@/lib/auth/auth-service'
import {
  activateMockPersonaSession,
  clearMockPersonaSession,
  findSyntheticPersonaByEmail,
  getSyntheticPersonas,
  type SyntheticPersonaKey,
} from '@/lib/auth/mock-auth-service'
import {
  getSupabaseClient,
  resolveSaaisEnvConfig,
} from '@/lib/supabase/client'
import type { SaaisRole } from '@/mocks/personas'
import {
  AuthContext,
  type AuthContextValue,
  type AuthProfile,
} from './auth-context'

const MOCK_PERSONA_STORAGE_KEY = 'saais_active_mock_persona'
const ACTIVE_ROLE_STORAGE_KEY = 'saais_active_role'
const KEEP_SIGNED_IN_STORAGE_KEY = 'saais_keep_signed_in'

function readStoredValue(key: string): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(key) ?? localStorage.getItem(key)
}

function writeStoredValue(
  key: string,
  value: string,
  keepSignedIn: boolean,
): void {
  if (typeof window === 'undefined') return
  if (keepSignedIn) {
    localStorage.setItem(key, value)
    sessionStorage.removeItem(key)
  } else {
    sessionStorage.setItem(key, value)
    localStorage.removeItem(key)
  }
}

function removeStoredValue(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const envConfig = useMemo(() => resolveSaaisEnvConfig(), [])
  const isMockMode = envConfig.mode === 'mock'

  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ApiSchema<'Profile'> | null>(null)
  const [roleAssignments, setRoleAssignments] = useState<
    readonly ApiSchema<'RoleAssignment'>[]
  >([])
  const [user, setUser] = useState<AuthProfile | null>(null)
  const [activePersonaKey, setActivePersonaKey] =
    useState<SyntheticPersonaKey | null>(null)
  const [activeRole, setActiveRoleState] = useState<SaaisRole | null>(null)
  const [keepSignedIn, setKeepSignedIn] = useState<boolean>(() => {
    const raw = readStoredValue(KEEP_SIGNED_IN_STORAGE_KEY)
    return raw === null ? true : raw === 'true'
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const roles = useMemo<readonly SaaisRole[]>(() => {
    return user?.roles ?? []
  }, [user])

  const primaryRole = useMemo<SaaisRole | null>(() => {
    return user?.primaryRole ?? null
  }, [user])

  const eligibility = useMemo(
    () => evaluateAccountEntryEligibility(profile, roles),
    [profile, roles],
  )

  const isAuthenticated = Boolean(session && user)
  const isAllowedToEnter = isAuthenticated && eligibility.isAllowedToEnter
  const entryBlockedReason = isAuthenticated ? eligibility.reason : null

  const clearAuthState = useCallback(() => {
    clearMockPersonaSession()
    setActivePersonaKey(null)
    setProfile(null)
    setRoleAssignments([])
    setUser(null)
    setSession(null)
    setActiveRoleState(null)
    removeStoredValue(MOCK_PERSONA_STORAGE_KEY)
    removeStoredValue(ACTIVE_ROLE_STORAGE_KEY)
    removeStoredValue(KEEP_SIGNED_IN_STORAGE_KEY)
  }, [])

  const switchMockPersona = useCallback(
    (
      personaKey: SyntheticPersonaKey | null,
      options?: { keepSignedIn?: boolean; provider?: 'password' | 'google' },
    ) => {
      if (!personaKey) {
        clearAuthState()
        return
      }

      const persistChoice = options?.keepSignedIn ?? keepSignedIn
      const provider = options?.provider ?? 'password'
      const activated = activateMockPersonaSession(personaKey, provider)
      const resolvedRoles = Array.from(
        new Set<SaaisRole>([
          activated.profile.role,
          ...(activated.profile.roles ?? []),
          ...activated.roleAssignments.map((r) => r.role),
        ]),
      )

      const authProfile: AuthProfile = {
        id: activated.profile.id,
        email: activated.profile.email,
        fullName: activated.profile.full_name,
        primaryRole: activated.profile.role,
        roles: resolvedRoles,
        facultyId: activated.profile.faculty_id,
        departmentId: activated.profile.department_id,
        status: activated.profile.status,
        studentNumber: activated.profile.student_number,
        authProvider: provider,
      }

      setKeepSignedIn(persistChoice)
      setActivePersonaKey(personaKey)
      setProfile(activated.profile)
      setRoleAssignments(activated.roleAssignments)
      setUser(authProfile)
      setSession(activated.session)
      setActiveRoleState(authProfile.primaryRole)

      writeStoredValue(MOCK_PERSONA_STORAGE_KEY, personaKey, persistChoice)
      writeStoredValue(
        ACTIVE_ROLE_STORAGE_KEY,
        authProfile.primaryRole,
        persistChoice,
      )
      writeStoredValue(
        KEEP_SIGNED_IN_STORAGE_KEY,
        String(persistChoice),
        persistChoice,
      )
    },
    [clearAuthState, keepSignedIn],
  )

  const setActiveRole = useCallback(
    (newRole: SaaisRole) => {
      if (!roles.includes(newRole)) {
        console.warn(`Cannot switch to unassigned role: ${newRole}`)
        return
      }
      setActiveRoleState(newRole)
      writeStoredValue(ACTIVE_ROLE_STORAGE_KEY, newRole, keepSignedIn)
    },
    [roles, keepSignedIn],
  )

  const hydrateFromRealSession = useCallback(
    async (activeSession: Session | null) => {
      if (!activeSession?.user) {
        setSession(null)
        setProfile(null)
        setRoleAssignments([])
        setUser(null)
        setActiveRoleState(null)
        return
      }

      setSession(activeSession)
      try {
        const boundary = await fetchAuthenticatedUserBoundary(
          activeSession.user.id,
        )
        setProfile(boundary.profile)
        setRoleAssignments(boundary.roleAssignments)

        if (boundary.profile) {
          const provider =
            activeSession.user.app_metadata?.provider === 'google'
              ? 'google'
              : 'password'
          const authProfile: AuthProfile = {
            id: boundary.profile.id,
            email: boundary.profile.email,
            fullName: boundary.profile.full_name,
            primaryRole: boundary.profile.role,
            roles: boundary.roles,
            facultyId: boundary.profile.faculty_id,
            departmentId: boundary.profile.department_id,
            status: boundary.profile.status,
            studentNumber: boundary.profile.student_number,
            authProvider: provider,
          }
          setUser(authProfile)
          setActiveRoleState((prev) =>
            prev && boundary.roles.includes(prev)
              ? prev
              : authProfile.primaryRole,
          )
        } else {
          setUser(null)
          setActiveRoleState(null)
        }
      } catch (err) {
        console.warn('Unable to load user profile through API boundary:', err)
        setProfile(null)
        setRoleAssignments([])
        setUser(null)
        setActiveRoleState(null)
      }
    },
    [],
  )

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        if (isMockMode) {
          const personas = getSyntheticPersonas()
          const storedKey = readStoredValue(
            MOCK_PERSONA_STORAGE_KEY,
          ) as SyntheticPersonaKey | null

          if (storedKey && storedKey in personas) {
            const storedPersist =
              readStoredValue(KEEP_SIGNED_IN_STORAGE_KEY) !== 'false'
            switchMockPersona(storedKey, { keepSignedIn: storedPersist })
            const storedRole = readStoredValue(
              ACTIVE_ROLE_STORAGE_KEY,
            ) as SaaisRole | null
            if (storedRole && personas[storedKey].roles.includes(storedRole)) {
              setActiveRoleState(storedRole)
            }
          } else {
            const currentToken = getMockSessionToken()
            if (currentToken) {
              const matched = Object.values(personas).find(
                (p) => p.token === currentToken,
              )
              if (matched) {
                switchMockPersona(matched.key)
              }
            }
          }
          if (isMounted) setIsLoading(false)
          return
        }

        try {
          const client = getSupabaseClient('supabase')
          const {
            data: { session: initialSession },
          } = await client.auth.getSession()

          if (isMounted && initialSession) {
            await hydrateFromRealSession(initialSession)
          }
        } catch (clientErr) {
          console.warn('Supabase client could not be initialized:', clientErr)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void initAuth()

    if (!isMockMode) {
      try {
        const client = getSupabaseClient('supabase')
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange(async (_event, newSession) => {
          if (!isMounted) return
          await hydrateFromRealSession(newSession)
        })

        return () => {
          isMounted = false
          subscription.unsubscribe()
        }
      } catch {
        // Ignored when Supabase credentials are not configured
      }
    }

    return () => {
      isMounted = false
    }
  }, [isMockMode, switchMockPersona, hydrateFromRealSession])

  const signInWithPassword = useCallback(
    async (email: string, password: string, persistChoice = true) => {
      setIsLoading(true)
      const trimmedEmail = email.trim()

      try {
        if (!trimmedEmail.includes('@')) {
          throw new Error('Please enter a valid institutional email address.')
        }

        if (!isInstitutionalEmail(trimmedEmail)) {
          throw new Error(
            'Sign-in was rejected: Only institutional emails (.edu.ph) are permitted.',
          )
        }

        if (isMockMode) {
          const matchedPersona = findSyntheticPersonaByEmail(trimmedEmail)

          if (!matchedPersona) {
            throw new Error(
              `Sign-in was rejected: Your email (${trimmedEmail}) is not a registered institutional profile. Please contact your department administrator.`,
            )
          }

          const dbCheck = evaluateAccountEntryEligibility(
            { status: matchedPersona.status, email: matchedPersona.email },
            matchedPersona.roles,
          )
          if (!dbCheck.isAllowedToEnter) {
            throw new Error(
              dbCheck.reason ??
                'Sign-in was rejected: Account is not permitted to enter.',
            )
          }

          switchMockPersona(matchedPersona.key, {
            keepSignedIn: persistChoice,
            provider: 'password',
          })
          return
        }

        const client = getSupabaseClient('supabase')
        setKeepSignedIn(persistChoice)
        writeStoredValue(
          KEEP_SIGNED_IN_STORAGE_KEY,
          String(persistChoice),
          persistChoice,
        )
        const { data, error: authError } = await client.auth.signInWithPassword(
          {
            email: trimmedEmail,
            password,
          },
        )
        if (authError) throw authError
        if (data?.session) {
          await hydrateFromRealSession(data.session)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [isMockMode, switchMockPersona, hydrateFromRealSession],
  )

  const signInWithGoogle = useCallback(
    async (persistChoice = true) => {
      setIsLoading(true)
      try {
        if (isMockMode) {
          switchMockPersona('student', {
            keepSignedIn: persistChoice,
            provider: 'google',
          })
          return
        }

        setKeepSignedIn(persistChoice)
        writeStoredValue(
          KEEP_SIGNED_IN_STORAGE_KEY,
          String(persistChoice),
          persistChoice,
        )
        const client = getSupabaseClient('supabase')
        const redirectTo = `${window.location.origin}/auth/callback`
        const { error: oauthError } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        })
        if (oauthError) throw oauthError
      } finally {
        setIsLoading(false)
      }
    },
    [isMockMode, switchMockPersona],
  )

  const signOut = useCallback(async () => {
    if (isMockMode) {
      clearAuthState()
      return
    }

    try {
      const client = getSupabaseClient('supabase')
      await client.auth.signOut()
    } finally {
      clearAuthState()
    }
  }, [isMockMode, clearAuthState])

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session,
      roles,
      roleAssignments,
      activeRole,
      primaryRole,
      isLoading,
      isAuthenticated,
      isAllowedToEnter,
      entryBlockedReason,
      keepSignedIn,
      isMockMode,
      activePersonaKey,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      setActiveRole,
      switchMockPersona,
    }),
    [
      user,
      profile,
      session,
      roles,
      roleAssignments,
      activeRole,
      primaryRole,
      isLoading,
      isAuthenticated,
      isAllowedToEnter,
      entryBlockedReason,
      keepSignedIn,
      isMockMode,
      activePersonaKey,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      setActiveRole,
      switchMockPersona,
    ],
  )

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}
