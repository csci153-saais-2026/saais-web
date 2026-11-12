import React, { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  getSyntheticPersonas,
  type SyntheticPersonaKey,
} from '@/lib/auth/mock-auth-service'
import type { SaaisRole } from '@/mocks/personas'

const PERSONA_LIST: {
  key: SyntheticPersonaKey
  badge: string
  desc: string
}[] = [
  { key: 'student', badge: 'bg-[#2F4A12] text-[#FBF8EF]', desc: 'Student Primary (Active)' },
  { key: 'student_secondary', badge: 'bg-[#B0761A] text-white', desc: 'Student Invited (Pending)' },
  { key: 'student_other_dept', badge: 'bg-[#2F4A12] text-[#FBF8EF]', desc: 'Other Dept Student' },
  { key: 'adviser', badge: 'bg-[#B0761A] text-white', desc: 'Primary Academic Adviser' },
  { key: 'adviser_secondary', badge: 'bg-[#B0761A] text-white', desc: 'Secondary Adviser' },
  { key: 'department_head', badge: 'bg-[#285A84] text-white', desc: 'Dept Head + Adviser' },
  { key: 'department_staff', badge: 'bg-[#4B6B94] text-white', desc: 'Department Staff' },
  { key: 'dean_only', badge: 'bg-[#6D327C] text-white', desc: 'Dean-Only Account' },
  { key: 'dean', badge: 'bg-[#6D327C] text-white', desc: 'Computing Dean + Adviser' },
  { key: 'dean_dept_head', badge: 'bg-[#8E3250] text-white', desc: 'Dean + Dept Head + Adviser' },
  { key: 'admin', badge: 'bg-[#9E2E1C] text-white', desc: 'System Admin + Adviser' },
  { key: 'disabled_account', badge: 'bg-[#6E6C58] text-white', desc: 'Inactive / Disabled Account' },
]

export const DevRoleSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const {
    user,
    roles,
    activeRole,
    activePersonaKey,
    isAllowedToEnter,
    switchMockPersona,
    setActiveRole,
    signOut,
  } = useAuth()

  if (!import.meta.env.DEV) {
    return null
  }

  const personas = getSyntheticPersonas()

  return (
    <aside
      aria-label="Developer Persona Switcher"
      className="fixed bottom-4 right-4 z-50 font-sans text-xs select-none"
    >
      {isOpen ? (
        <div className="bg-[#1D2F0A] text-[#FBF8EF] border border-[rgba(246,242,228,0.2)] rounded-lg p-3 shadow-2xl w-80 max-h-[85vh] overflow-y-auto backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(246,242,228,0.15)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E0A82E] animate-pulse" />
              <span className="font-semibold tracking-wide text-[#E0A82E] uppercase text-[10px]">
                Dev Persona Switcher
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[rgba(246,242,228,0.6)] hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-[rgba(246,242,228,0.7)] mb-2">
            Active User:{' '}
            <span className="font-bold text-white">
              {user ? user.fullName : 'Logged Out'}
            </span>
            {user && !isAllowedToEnter && (
              <span className="ml-1 text-[#F87171] font-semibold">
                ({user.status})
              </span>
            )}
          </p>

          {roles.length > 1 && (
            <div className="mb-3 p-2 bg-[rgba(246,242,228,0.08)] rounded border border-[rgba(246,242,228,0.15)]">
              <span className="text-[10px] text-[#E0A82E] uppercase font-semibold block mb-1">
                Active Role Portal View:
              </span>
              <div className="flex flex-wrap gap-1">
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => setActiveRole(r as SaaisRole)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                      activeRole === r
                        ? 'bg-[#E0A82E] text-[#1D2F0A] font-bold'
                        : 'bg-[rgba(255,255,255,0.15)] text-white hover:bg-[rgba(255,255,255,0.25)]'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {PERSONA_LIST.map(({ key, badge, desc }) => {
              const persona = personas[key]
              const isSelected = activePersonaKey === key
              return (
                <button
                  key={key}
                  onClick={() => switchMockPersona(key)}
                  className={`flex flex-col items-start p-2 rounded text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[rgba(246,242,228,0.18)] border border-[#E0A82E]'
                      : 'hover:bg-[rgba(246,242,228,0.08)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full justify-between">
                    <span className="font-medium text-white">
                      {persona.fullName}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] ${badge}`}>
                      {persona.primaryRole.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-[rgba(246,242,228,0.6)]">
                    {desc} ({persona.email})
                  </span>
                </button>
              )
            })}

            <button
              onClick={() => {
                switchMockPersona(null)
                void signOut()
              }}
              className={`flex flex-col items-start p-2 rounded text-left transition-colors cursor-pointer mt-1 ${
                !user
                  ? 'bg-[rgba(246,242,228,0.18)] border border-[#E0A82E]'
                  : 'hover:bg-[rgba(246,242,228,0.08)] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 w-full justify-between">
                <span className="font-medium text-white">Log Out</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#6E6C58] text-white">
                  UNAUTHENTICATED
                </span>
              </div>
              <span className="text-[10px] text-[rgba(246,242,228,0.6)]">
                Simulate anonymous guest visitor
              </span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-[#1D2F0A] hover:bg-[#2F4A12] text-[#FBF8EF] border border-[#E0A82E] px-3.5 py-2 rounded-full shadow-lg transition-all transform hover:scale-105 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-[#E0A82E] animate-pulse" />
          <span className="font-medium text-[11px]">
            Dev Persona:{' '}
            <span className="font-bold text-[#E0A82E]">
              {user ? `${user.fullName} (${activeRole})` : 'Logged Out'}
            </span>
          </span>
        </button>
      )}
    </aside>
  )
}
