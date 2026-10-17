import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../../hooks/useSession'

export const OAuthCallback: React.FC = () => {
  const { session, role, isLoading } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return

    if (!session) {
      const params = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, ''))
      const errorMsg = params.get('error_description') || params.get('error')
      if (errorMsg) {
        navigate(`/login?error=${encodeURIComponent(errorMsg)}`, { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
      return
    }

    if (role === 'admin') {
      navigate('/admin', { replace: true })
    } else if (role === 'adviser') {
      navigate('/adviser', { replace: true })
    } else {
      navigate('/student', { replace: true })
    }
  }, [session, role, isLoading, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8EF]">
      <div className="flex flex-col items-center gap-3 text-[#2F4A12]">
        <div className="w-8 h-8 border-3 border-[#2F4A12] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Authenticating institutional profile...</span>
      </div>
    </div>
  )
}
