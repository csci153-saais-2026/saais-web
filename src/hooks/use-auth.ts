import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { getSupabaseClient } from '@/lib/supabase/client'

const defaultFallbackAuth: AuthContextValue = {
  user: null,
  profile: null,
  session: null,
  roles: [],
  roleAssignments: [],
  activeRole: null,
  primaryRole: null,
  isLoading: false,
  isAuthenticated: false,
  isAllowedToEnter: false,
  entryBlockedReason: null,
  keepSignedIn: true,
  isMockMode: false,
  activePersonaKey: null,
  signInWithPassword: async (email, password) => {
    const client = getSupabaseClient('supabase')
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw error
  },
  signInWithGoogle: async () => {},
  signOut: async () => {},
  setActiveRole: () => {},
  switchMockPersona: () => {},
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  return context ?? defaultFallbackAuth
}
