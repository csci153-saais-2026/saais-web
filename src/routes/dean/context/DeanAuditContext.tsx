import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/hooks/use-auth"
import type { DeanAuditAction, DeanAuditEntry } from "@/routes/dean/types"

const STORAGE_KEY = "saais-dean-audit-v1"

export const SEED_DEAN_AUDIT_ENTRIES: readonly DeanAuditEntry[] = [
  {
    id: "seed-1",
    timestamp: "16 Oct 2026 09:14",
    actor: "Prof. Mara Reyes",
    action: "View",
    student: "Ana Reyes",
    studentNumber: "23-1-01234",
    details: "Opened checklist",
  },
  {
    id: "seed-2",
    timestamp: "14 Oct 2026 16:02",
    actor: "Prof. Mara Reyes",
    action: "Change",
    student: "Ana Reyes",
    studentNumber: "23-1-01234",
    details: "CSci 25 final: 2.25 → 2.50",
  },
  {
    id: "seed-3",
    timestamp: "14 Oct 2026 15:40",
    actor: "Dr. Paz Villanueva",
    action: "View",
    student: "—",
    details: "Report drill-down: batch 2023 (96 students)",
  },
  {
    id: "seed-4",
    timestamp: "13 Oct 2026 08:01",
    actor: "System administrator",
    action: "View",
    student: "Ben Lopez",
    studentNumber: "23-1-01301",
    details: "Opened grades by term",
  },
]

function formatLocalTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function readStoredEntries(): DeanAuditEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return [...SEED_DEAN_AUDIT_ENTRIES]
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as DeanAuditEntry[]
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
  return [...SEED_DEAN_AUDIT_ENTRIES]
}

interface DeanAuditContextValue {
  entries: DeanAuditEntry[]
  recordAuditEvent: (input: {
    action?: DeanAuditAction
    student?: string
    studentNumber?: string
    details: string
  }) => void
}

const DeanAuditContext = createContext<DeanAuditContextValue | null>(null)

export function DeanAuditProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<DeanAuditEntry[]>(() => readStoredEntries())

  const recordAuditEvent = useCallback(
    (input: {
      action?: DeanAuditAction
      student?: string
      studentNumber?: string
      details: string
    }) => {
      const actor = user?.fullName || "Dr. Paz Villanueva"
      const nextEntry: DeanAuditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: formatLocalTimestamp(),
        actor,
        action: input.action ?? "View",
        student: input.student ?? "—",
        studentNumber: input.studentNumber,
        details: input.details,
      }

      setEntries((prev) => {
        const next = [nextEntry, ...prev]
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Ignore storage write errors
        }
        return next
      })
    },
    [user?.fullName],
  )

  const value = useMemo(
    () => ({ entries, recordAuditEvent }),
    [entries, recordAuditEvent],
  )

  return <DeanAuditContext.Provider value={value}>{children}</DeanAuditContext.Provider>
}

export function useDeanAudit(): DeanAuditContextValue {
  const ctx = useContext(DeanAuditContext)
  if (!ctx) {
    return {
      entries: [...SEED_DEAN_AUDIT_ENTRIES],
      recordAuditEvent: () => undefined,
    }
  }
  return ctx
}
