import { createContext, useContext } from "react"
import type { DeanAuditAction, DeanAuditEntry } from "@/routes/dean/types"

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

export interface DeanAuditContextValue {
  entries: DeanAuditEntry[]
  recordAuditEvent: (input: {
    action?: DeanAuditAction
    student?: string
    studentNumber?: string
    details: string
  }) => void
}

export const DeanAuditContext = createContext<DeanAuditContextValue | null>(null)

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
