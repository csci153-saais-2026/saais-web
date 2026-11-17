import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { postDeanAuditViewEvent } from "@/routes/dean/api/dean.api"
import {
  DeanAuditContext,
  SEED_DEAN_AUDIT_ENTRIES,
} from "@/routes/dean/context/dean-audit-context"
import type { DeanAuditAction, DeanAuditEntry } from "@/routes/dean/types"

const STORAGE_KEY = "saais-dean-audit-v1"

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

      const eventType = input.details.includes("PDF")
        ? "pdf_exported"
        : input.details.includes("CSV")
          ? "csv_exported"
          : input.studentNumber
            ? "student_record_viewed"
            : "report_viewed"

      void postDeanAuditViewEvent({
        event_type: eventType,
        report_type: "faculty",
        details: input.details,
      }).catch(() => {
        // Session audit log remains intact even when offline or unmounted in tests
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
