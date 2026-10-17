import React, { useState } from 'react'
import { useSession } from '../hooks/useSession'
import type { UserRole } from '../context/session-context'

export const DevRoleSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { role, isDevOverride, setDevRole, signOut } = useSession()

  if (!import.meta.env.DEV) {
    return null
  }

  const roles: { id: UserRole | 'none'; label: string; badge: string; desc: string }[] = [
    { id: 'student', label: 'Student', badge: 'bg-[#2F4A12] text-[#FBF8EF]', desc: 'Juan Dela Cruz (2023-00001)' },
    { id: 'adviser', label: 'Adviser', badge: 'bg-[#B0761A] text-white', desc: 'Dr. Maria Santos' },
    { id: 'admin', label: 'Admin', badge: 'bg-[#9E2E1C] text-white', desc: 'System Administrator' },
    { id: 'none', label: 'Logged Out', badge: 'bg-[#6E6C58] text-white', desc: 'Unauthenticated visitor' },
  ]

  return (
    <aside aria-label="Developer Role Switcher" className="fixed bottom-4 right-4 z-50 font-sans text-xs select-none">
      {isOpen ? (
        <div className="bg-[#1D2F0A] text-[#FBF8EF] border border-[rgba(246,242,228,0.2)] rounded-lg p-3 shadow-2xl w-64 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(246,242,228,0.15)]">
            <span className="font-semibold tracking-wide text-[#E0A82E] uppercase text-[10px]">
              Dev Role Switcher
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[rgba(246,242,228,0.6)] hover:text-white px-1.5 py-0.5 rounded"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-[rgba(246,242,228,0.7)] mb-2.5">
            Active persona:{' '}
            <span className="font-bold text-white capitalize">
              {role || 'Logged Out'}
            </span>
            {isDevOverride && <span className="ml-1 text-[#E0A82E]">(Simulated)</span>}
          </p>

          <div className="flex flex-col gap-1.5">
            {roles.map((r) => {
              const isSelected = (r.id === 'none' && !role) || role === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setDevRole(r.id)
                  }}
                  className={`flex flex-col items-start p-2 rounded text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[rgba(246,242,228,0.18)] border border-[#E0A82E]'
                      : 'hover:bg-[rgba(246,242,228,0.08)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full justify-between">
                    <span className="font-medium">{r.label}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${r.badge}`}>
                      {r.id.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-[rgba(246,242,228,0.55)]">{r.desc}</span>
                </button>
              )
            })}
          </div>

          {isDevOverride && (
            <button
              onClick={() => {
                setDevRole(null)
                signOut()
              }}
              className="mt-3 w-full text-center py-1.5 rounded bg-[rgba(246,242,228,0.1)] hover:bg-[rgba(246,242,228,0.18)] text-[11px] text-[#FBF8EF] transition-colors cursor-pointer"
            >
              Reset to Real Supabase Auth
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-[#1D2F0A] hover:bg-[#2F4A12] text-[#FBF8EF] border border-[#E0A82E] px-3 py-2 rounded-full shadow-lg transition-all transform hover:scale-105 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-[#E0A82E] animate-pulse" />
          <span className="font-medium text-[11px]">
            Dev Role: <span className="font-bold text-[#E0A82E] capitalize">{role || 'None'}</span>
          </span>
        </button>
      )}
    </aside>
  )
}
