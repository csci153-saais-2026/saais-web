import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type UserRole = 'student' | 'adviser' | 'admin'
export type ProfileStatus = 'invited' | 'active' | 'disabled'

export interface UserProfile {
  id: string
  role: UserRole
  email: string
  full_name?: string | null
  student_number?: string | null
  status: ProfileStatus
  created_at?: string
  updated_at?: string
  faculty_id?: string | null
}

export interface SessionContextType {
  session: Session | null
  profile: UserProfile | null
  role: UserRole | null
  status: ProfileStatus | null
  isLoading: boolean
  isDevOverride: boolean
  setDevRole: (role: UserRole | 'none' | null) => void
  signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined)
