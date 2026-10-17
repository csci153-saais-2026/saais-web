import React, { useEffect, useState, useMemo, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase/client'
import {
  SessionContext,
  type SessionContextType,
  type UserProfile,
  type UserRole,
  type ProfileStatus,
} from './session-context'

const DEV_PROFILES: Record<UserRole, UserProfile> = {
  student: {
    id: 'dev-student-id',
    role: 'student',
    email: 'student@advising.edu.ph',
    full_name: 'Juan Dela Cruz (Student Dev)',
    student_number: '2023-00001',
    status: 'active',
  },
  adviser: {
    id: 'dev-adviser-id',
    role: 'adviser',
    email: 'adviser@advising.edu.ph',
    full_name: 'Dr. Maria Santos (Adviser Dev)',
    status: 'active',
  },
  admin: {
    id: 'dev-admin-id',
    role: 'admin',
    email: 'admin@advising.edu.ph',
    full_name: 'System Admin (Dev)',
    status: 'active',
  },
}

const DEV_ROLE_STORAGE_KEY = 'saais_dev_role_override'

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [realProfile, setRealProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [devRole, setDevRoleState] = useState<UserRole | 'none' | null>(() => {
    if (import.meta.env.DEV) {
      const stored = localStorage.getItem(DEV_ROLE_STORAGE_KEY)
      if (stored === 'student' || stored === 'adviser' || stored === 'admin' || stored === 'none') {
        return stored
      }
    }
    return null
  })

  const setDevRole = useCallback((newRole: UserRole | 'none' | null) => {
    if (!import.meta.env.DEV) return
    setDevRoleState(newRole)
    if (newRole) {
      localStorage.setItem(DEV_ROLE_STORAGE_KEY, newRole)
    } else {
      localStorage.removeItem(DEV_ROLE_STORAGE_KEY)
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    if (!isSupabaseConfigured) return null

    try {
      const { data, error } = await supabase
        .from('profile')
        .select('id, role, email, full_name, student_number, status, created_at, updated_at, faculty_id')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.warn('Could not load profile from database:', error?.message)
        return {
          id: userId,
          email: userEmail || '',
          role: 'student' as UserRole,
          status: 'active' as ProfileStatus,
        }
      }

      return data as UserProfile
    } catch (err) {
      console.error('Failed to query user profile:', err)
      return null
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          if (isMounted) setIsLoading(false)
          return
        }

        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (isMounted) {
          setSession(initialSession)
          if (initialSession?.user) {
            const profileData = await fetchProfile(initialSession.user.id, initialSession.user.email)
            if (isMounted) setRealProfile(profileData)
          }
        }
      } catch (err) {
        console.error('Error initializing auth session:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)

      if (newSession?.user) {
        setIsLoading(true)
        const profileData = await fetchProfile(newSession.user.id, newSession.user.email)
        if (isMounted) {
          setRealProfile(profileData)
          setIsLoading(false)
        }
      } else {
        setRealProfile(null)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setSession(null)
    setRealProfile(null)
    setDevRole(null)
  }, [setDevRole])

  const value = useMemo<SessionContextType>(() => {
    const isDevOverride = import.meta.env.DEV && devRole !== null

    let activeProfile: UserProfile | null = realProfile
    let activeRole: UserRole | null = realProfile?.role || null
    let activeStatus: ProfileStatus | null = realProfile?.status || null

    if (isDevOverride) {
      if (devRole === 'none') {
        activeProfile = null
        activeRole = null
        activeStatus = null
      } else {
        activeProfile = DEV_PROFILES[devRole]
        activeRole = devRole
        activeStatus = 'active'
      }
    }

    return {
      session: isDevOverride && devRole !== 'none' ? ({ user: { id: activeProfile?.id, email: activeProfile?.email } } as unknown as Session) : session,
      profile: activeProfile,
      role: activeRole,
      status: activeStatus,
      isLoading,
      isDevOverride,
      setDevRole,
      signOut,
    }
  }, [session, realProfile, devRole, isLoading, setDevRole, signOut])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
