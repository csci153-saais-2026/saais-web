import { useContext } from 'react'
import { SessionContext, type SessionContextType } from '../context/session-context'

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
