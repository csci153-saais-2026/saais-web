import { createContext, useContext } from "react"
import type { DirectoryStudent } from "./students-data"
import type { ReassignmentInput } from "../assignment-model"
import type { AuditEvent } from "../audit-data"
import type { SettingsState } from "../settings-data"

export type DepartmentHeadPreviewState = {
  students: DirectoryStudent[]
  auditEvents: AuditEvent[]
  settings: SettingsState
  reassignStudents: (input: ReassignmentInput) => void
  updateSettings: (next: SettingsState) => void
  resetPreview: () => void
  notify: (message: string) => void
}

export const PreviewContext = createContext<DepartmentHeadPreviewState | null>(null)

export function useDepartmentHeadPreview() {
  const value = useContext(PreviewContext)
  if (!value) throw new Error("Department Head preview pages need PreviewStateProvider.")
  return value
}

export function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date())
}
