import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import type { ApiSchema } from '@/lib/api'
import { getMockSessionToken } from '@/lib/api/auth-token'
import {
  AuthHydrationError,
  evaluateAccountEntryEligibility,
  extractRoleScopes,
  fetchAuthenticatedUserBoundary,
  isValidEmailFormat,
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
  getSupabaseSessionPersistence,
  resolveSaaisEnvConfig,
  setSupabaseSessionPersistence,
} from '@/lib/supabase/client'
import type { SaaisRole } from '@/mocks/personas'
import {
  AuthContext,
  type AuthContextValue,
  type AuthProfile,
} from './auth-context'

const MOCK_PERSONA_STORAGE_KEY = 'saais_active_mock_persona'
const ACTIVE_ROLE_STORAGE_KEY = 'saais_active_role'

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
  const envConfig = resolveSaaisEnvConfig()
  const isMockMode = envConfig.mode === 'mock' && !envConfig.configError

  const [keepSignedIn, setKeepSignedIn] = useState<boolean>(() =>
    getSupabaseSessionPersistence(),
  )
  const [user, setUser] = useState<AuthProfile | null>(null)
  const [profile, setProfile] = useState<ApiSchema<'Profile'> | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [roles, setRoles] = useState<SaaisRole[]>([])
  const [roleAssignments, setRoleAssignments] = useState<
    ApiSchema<'RoleAssignment'>[]
  >([])
  const [activeRole, setActiveRoleState] = useState<SaaisRole | null>(null)
  const [activePersonaKey, setActivePersonaKey] =
    useState<SyntheticPersonaKey | null>(null)
  const [entryBlockedReason, setEntryBlockedReason] = useState<string | null>(
    null,
  )
  const [authError, setAuthError] = useState<string | null>(
    () => envConfig.configError,
  )
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !isMockMode && !envConfig.configError,
  )

  const keepSignedInRef = useRef<boolean>(keepSignedIn)
  const hydrationRequestIdRef = useRef<number>(0)
  const [pendingRealSession, setPendingRealSession] = useState<Session | null>(
    null,
  )

  const clearAuthState = useCallback(
    (options?: { preserveBlockedReason?: string | null }) => {
      hydrationRequestIdRef.current += 1
      setUser(null)
      setProfile(null)
      setSession(null)
      setRoles([])
      setRoleAssignments([])
      setActiveRoleState(null)
      setActivePersonaKey(null)
      setEntryBlockedReason(options?.preserveBlockedReason ?? null)
      setAuthError(null)
      setIsPasswordRecovery(false)
      removeStoredValue(MOCK_PERSONA_STORAGE_KEY)
      removeStoredValue(ACTIVE_ROLE_STORAGE_KEY)
      if (isMockMode) {
        clearMockPersonaSession()
      }
    },
    [isMockMode],
  )

  const applyMockPersona = useCallback(
    (
      key: SyntheticPersonaKey,
      provider: 'password' | 'google' = 'password',
      persistChoice?: boolean,
    ) => {
      if (!isMockMode) return
      const shouldPersist = persistChoice ?? keepSignedInRef.current
      keepSignedInRef.current = shouldPersist
      setKeepSignedIn(shouldPersist)
      setSupabaseSessionPersistence(shouldPersist)

      const {
        descriptor,
        session: mockSession,
        profile: mockProfile,
        roleAssignments: mockAssignments,
      } = activateMockPersonaSession(key, provider)

      const roleSet = new Set<SaaisRole>()
      for (const assignment of mockAssignments) {
        roleSet.add(assignment.role)
      }
      const normalizedRoles = Array.from(roleSet)
      const eligibility = evaluateAccountEntryEligibility(
        mockProfile,
        normalizedRoles,
      )

      const authProfile: AuthProfile = {
        id: mockProfile.id,
        email: mockProfile.email,
        fullName: mockProfile.full_name,
        primaryRole: mockProfile.role,
        roles: normalizedRoles,
        facultyId: mockProfile.faculty_id ?? null,
        departmentId: mockProfile.department_id ?? null,
        status: mockProfile.status,
        studentNumber: mockProfile.student_number ?? null,
        authProvider: descriptor.authProvider ?? provider,
      }

      const storedRole = readStoredValue(ACTIVE_ROLE_STORAGE_KEY) as
        | SaaisRole
        | null
      const defaultRole =
        storedRole && normalizedRoles.includes(storedRole)
          ? storedRole
          : normalizedRoles[0] ?? mockProfile.role

      setUser(authProfile)
      setProfile(mockProfile)
      setSession(mockSession)
      setRoles(normalizedRoles)
      setRoleAssignments(mockAssignments)
      setActiveRoleState(defaultRole)
      setActivePersonaKey(key)
      setEntryBlockedReason(eligibility.reason)
      setAuthError(null)
      setIsLoading(false)

      writeStoredValue(MOCK_PERSONA_STORAGE_KEY, key, shouldPersist)
      writeStoredValue(ACTIVE_ROLE_STORAGE_KEY, defaultRole, shouldPersist)
    },
    [isMockMode],
  )

  const switchMockPersona = useCallback(
    (key: SyntheticPersonaKey | null) => {
      if (!isMockMode) return
      if (!key) {
        clearAuthState()
        return
      }
      applyMockPersona(key, 'password', keepSignedInRef.current)
    },
    [isMockMode, applyMockPersona, clearAuthState],
  )

  const hydrateFromRealSession = useCallback(
    async (nextSession: Session | null) => {
      const requestId = ++hydrationRequestIdRef.current

      if (!nextSession?.user) {
        if (requestId !== hydrationRequestIdRef.current) return
        setUser(null)
        setProfile(null)
        setSession(null)
        setRoles([])
        setRoleAssignments([])
        setActiveRoleState(null)
        setActivePersonaKey(null)
        setEntryBlockedReason(null)
        setAuthError(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setAuthError(null)

      try {
        const boundary = await fetchAuthenticatedUserBoundary(
          nextSession.user.id,
        )
        if (requestId !== hydrationRequestIdRef.current) return

        const eligibility = evaluateAccountEntryEligibility(
          boundary.profile,
          boundary.roles,
        )

        if (!eligibility.isAllowedToEnter || !boundary.profile) {
          // Confirmed ineligible account: clear the dangling Supabase session so
          // a disabled/invited/unprovisioned token does not remain active.
          try {
            const client = getSupabaseClient('supabase')
            await client.auth.signOut({ scope: 'local' })
          } catch {
            // Ignore signOut errors during cleanup
          }
          if (requestId !== hydrationRequestIdRef.current) return

          setUser(null)
          setProfile(boundary.profile)
          setSession(null)
          setRoles([])
          setRoleAssignments([])
          setActiveRoleState(null)
          setEntryBlockedReason(
            eligibility.reason ??
              'Your institutional account is not authorized to access SAAIS.',
          )
          setAuthError(null)
          setIsLoading(false)
          return
        }

        const matchedProfile = boundary.profile
        const providerRaw = nextSession.user.app_metadata?.provider
        const authProvider: 'password' | 'google' =
          providerRaw === 'google' ? 'google' : 'password'

        const authProfile: AuthProfile = {
          id: matchedProfile.id,
          email: matchedProfile.email,
          fullName: matchedProfile.full_name,
          primaryRole: matchedProfile.role,
          roles: boundary.roles,
          facultyId: matchedProfile.faculty_id ?? null,
          departmentId: matchedProfile.department_id ?? null,
          status: matchedProfile.status,
          studentNumber: matchedProfile.student_number ?? null,
          authProvider,
        }

        const storedRole = readStoredValue(ACTIVE_ROLE_STORAGE_KEY) as
          | SaaisRole
          | null
        const defaultRole =
          storedRole && boundary.roles.includes(storedRole)
            ? storedRole
            : boundary.roles[0] ?? matchedProfile.role

        setUser(authProfile)
        setProfile(matchedProfile)
        setSession(nextSession)
        setRoles(boundary.roles)
        setRoleAssignments(boundary.roleAssignments)
        setActiveRoleState(defaultRole)
        setEntryBlockedReason(null)
        setAuthError(null)
        setIsLoading(false)
      } catch (err: unknown) {
        if (requestId !== hydrationRequestIdRef.current) return
        // Fail closed on API/network failures without misclassifying as
        // revoked/deactivated and without wiping a recoverable session.
        const msg =
          err instanceof AuthHydrationError || err instanceof Error
            ? err.message
            : 'Unable to verify your institutional profile. Please retry.'
        setUser(null)
        setProfile(null)
        setSession(nextSession)
        setRoles([])
        setRoleAssignments([])
        setActiveRoleState(null)
        setEntryBlockedReason(null)
        setAuthError(msg)
        setIsLoading(false)
      }
    },
    [],
  )

  const retryHydration = useCallback(async () => {
    if (isMockMode || envConfig.configError) return
    const client = getSupabaseClient('supabase')
    setIsLoading(true)
    const { data, error } = await client.auth.getSession()
    if (error) {
      setAuthError(error.message)
      setIsLoading(false)
      return
    }
    await hydrateFromRealSession(data.session ?? null)
  }, [isMockMode, envConfig.configError, hydrateFromRealSession])

  // Initialize auth state (mock restore OR real Supabase listener + getSession)
  useEffect(() => {
    if (envConfig.configError) {
      return
    }

    if (isMockMode) {
      const storedKey = readStoredValue(MOCK_PERSONA_STORAGE_KEY) as
        | SyntheticPersonaKey
        | null
      const personas = getSyntheticPersonas()
      if (storedKey && storedKey in personas) {
        queueMicrotask(() => {
          applyMockPersona(storedKey, 'password', keepSignedInRef.current)
        })
      } else {
        const existingToken = getMockSessionToken()
        if (existingToken) {
          const matchedEntry = Object.values(personas).find(
            (p) => p.token === existingToken,
          )
          if (matchedEntry) {
            queueMicrotask(() => {
              applyMockPersona(
                matchedEntry.key,
                'password',
                keepSignedInRef.current,
              )
            })
          }
        }
      }
      return
    }

    let isMounted = true
    const client = getSupabaseClient('supabase')

    // Keep onAuthStateChange strictly synchronous per Supabase guidance to avoid
    // client lock deadlocks when calling getSession() inside middleware.
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false)
      }
      if (!nextSession) {
        hydrationRequestIdRef.current += 1
        setPendingRealSession(null)
        setUser(null)
        setProfile(null)
        setSession(null)
        setRoles([])
        setRoleAssignments([])
        setActiveRoleState(null)
        setAuthError(null)
        setIsLoading(false)
      } else {
        setIsLoading(true)
        setPendingRealSession(nextSession)
      }
    })

    client.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return
        if (!data.session) {
          setPendingRealSession(null)
          setIsLoading(false)
        } else {
          setPendingRealSession(data.session)
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Unable to initialize authentication session.',
        )
        setIsLoading(false)
      })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [isMockMode, envConfig.configError, applyMockPersona])

  // Schedule hydration asynchronously outside the onAuthStateChange callback
  useEffect(() => {
    if (isMockMode || envConfig.configError) return
    if (!pendingRealSession) return
    queueMicrotask(() => {
      void hydrateFromRealSession(pendingRealSession)
    })
  }, [
    isMockMode,
    envConfig.configError,
    pendingRealSession,
    hydrateFromRealSession,
  ])

  const signInWithPassword = useCallback(
    async (email: string, password: string, keep = true) => {
      if (envConfig.configError) {
        throw new Error(envConfig.configError)
      }

      const trimmedEmail = email.trim()
      if (!isValidEmailFormat(trimmedEmail)) {
        throw new Error('Please enter a valid institutional email address.')
      }

      keepSignedInRef.current = keep
      setKeepSignedIn(keep)
      setSupabaseSessionPersistence(keep)
      setAuthError(null)

      if (isMockMode) {
        const matched = findSyntheticPersonaByEmail(trimmedEmail)
        if (!matched) {
          throw new Error(
            `Sign-in was rejected: Your email (${trimmedEmail}) is not a registered institutional profile. Please contact your department administrator.`,
          )
        }

        const { profile: mockProfile, roleAssignments: mockAssignments } =
          activateMockPersonaSession(matched.key, 'password')
        const assignedRoles = Array.from(
          new Set(mockAssignments.map((a) => a.role)),
        )
        const eligibility = evaluateAccountEntryEligibility(
          mockProfile,
          assignedRoles,
        )
        if (!eligibility.isAllowedToEnter) {
          clearMockPersonaSession()
          throw new Error(
            eligibility.reason ??
              'Your institutional account is not authorized to sign in.',
          )
        }

        applyMockPersona(matched.key, 'password', keep)
        return
      }

      const client = getSupabaseClient('supabase')
      const { data, error } = await client.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        throw error
      }

      if (data.session) {
        await hydrateFromRealSession(data.session)
      }
    },
    [envConfig.configError, isMockMode, applyMockPersona, hydrateFromRealSession],
  )

  const signInWithGoogle = useCallback(
    async (keep = keepSignedInRef.current) => {
      if (envConfig.configError) {
        throw new Error(envConfig.configError)
      }

      keepSignedInRef.current = keep
      setKeepSignedIn(keep)
      setSupabaseSessionPersistence(keep)
      setAuthError(null)

      if (isMockMode) {
        const storedKey = readStoredValue(MOCK_PERSONA_STORAGE_KEY) as
          | SyntheticPersonaKey
          | null
        const targetKey = storedKey ?? 'adviser'
        const personas = getSyntheticPersonas()
        const target = personas[targetKey]
        if (target?.status === 'disabled') {
          throw new Error(
            'Sign-in was rejected: Your institutional account has been deactivated. Please contact your department administrator.',
          )
        }
        applyMockPersona(targetKey, 'google', keep)
        return
      }

      const client = getSupabaseClient('supabase')
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined

      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            hd: 'vsu.edu.ph',
          },
        },
      })

      if (error) {
        throw error
      }
    },
    [envConfig.configError, isMockMode, applyMockPersona],
  )

  const signOut = useCallback(async () => {
    setPendingRealSession(null)
    clearAuthState()
    if (!isMockMode && !envConfig.configError) {
      const client = getSupabaseClient('supabase')
      const { error } = await client.auth.signOut()
      if (error) {
        console.error('Supabase sign out error:', error)
      }
    }
  }, [isMockMode, envConfig.configError, clearAuthState])

  const setActiveRole = useCallback(
    (role: SaaisRole) => {
      if (!roles.includes(role)) return
      setActiveRoleState(role)
      writeStoredValue(ACTIVE_ROLE_STORAGE_KEY, role, keepSignedInRef.current)
    },
    [roles],
  )

  const eligibility = useMemo(
    () =>
      user
        ? evaluateAccountEntryEligibility(
            { status: user.status ?? 'active', email: user.email },
            roles,
          )
        : { isAllowedToEnter: false, reason: entryBlockedReason },
    [user, roles, entryBlockedReason],
  )

  const roleScopes = useMemo(
    () => extractRoleScopes(roleAssignments),
    [roleAssignments],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session,
      roles,
      roleAssignments,
      roleScopes,
      activeRole,
      primaryRole: user?.primaryRole ?? null,
      isLoading,
      isAuthenticated: Boolean(user),
      isAllowedToEnter: eligibility.isAllowedToEnter,
      entryBlockedReason: eligibility.reason ?? entryBlockedReason,
      authError,
      isPasswordRecovery,
      keepSignedIn,
      isMockMode,
      activePersonaKey,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      retryHydration,
      setActiveRole,
      switchMockPersona,
    }),
    [
      user,
      profile,
      session,
      roles,
      roleAssignments,
      roleScopes,
      activeRole,
      isLoading,
      eligibility.isAllowedToEnter,
      eligibility.reason,
      entryBlockedReason,
      authError,
      isPasswordRecovery,
      keepSignedIn,
      isMockMode,
      activePersonaKey,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      retryHydration,
      setActiveRole,
      switchMockPersona,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
