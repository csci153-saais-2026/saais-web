import { Fragment, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/icons"
import { PreviewContext, todayInManila } from "./preview-state"
import { SAMPLE_STUDENTS, type DirectoryStudent } from "./students-data"
import { applyReassignment, type ReassignmentInput } from "../adviser-assignments/assignment-model"
import { SAMPLE_AUDIT_EVENTS, type AuditEvent } from "../audit-data"
import { DEFAULT_SETTINGS, type SettingsState } from "../settings-data"

function initialStudents(): DirectoryStudent[] {
  return SAMPLE_STUDENTS.map((student) => ({
    ...student,
    adviserSince: "2025-08-05",
    previousAdviser: student.id === "23-1-00218" ? "Prof. Adrian Tan" : undefined,
  }))
}

/** Shared in-memory demo state. It never reads or writes an API or browser storage. */
export function PreviewStateProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState(initialStudents)
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => [...SAMPLE_AUDIT_EVENTS])
  const [settings, setSettings] = useState<SettingsState>(() => structuredClone(DEFAULT_SETTINGS))
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const [resetVersion, setResetVersion] = useState(0)
  const sequence = useRef(0)

  function notify(message: string) {
    setToast({ id: ++sequence.current, message })
  }

  function event(details: Omit<AuditEvent, "id" | "timestamp" | "person">): AuditEvent {
    return {
      ...details,
      id: `preview-event-${++sequence.current}`,
      timestamp: new Date().toISOString(),
      person: "Demo Department Head",
    }
  }

  function reassignStudents(input: ReassignmentInput) {
    const updated = applyReassignment(students, input, todayInManila())
    const changed = updated.filter((student, index) => student !== students[index])
    setStudents(updated)
    const events = changed.map((student) => event({
      action: "Change",
      studentName: student.name,
      studentNumber: student.studentNumber,
      record: "Adviser assignment",
      details: `${student.scheduledAssignment ? "Scheduled reassignment" : "Reassigned"} to ${input.adviser} effective ${input.effectiveDate}. Reason: ${input.reason.trim()}`,
    }))
    setAuditEvents((current) => [...events, ...current])
  }

  function updateSettings(next: SettingsState) {
    setSettings(structuredClone(next))
    const entry = event({ action: "Change", record: "Department settings", details: "Updated department preview settings. No emails or backups were created." })
    setAuditEvents((current) => [entry, ...current])
  }

  function resetPreview() {
    setStudents(initialStudents())
    setAuditEvents([...SAMPLE_AUDIT_EVENTS])
    setSettings(structuredClone(DEFAULT_SETTINGS))
    setResetVersion((version) => version + 1)
    notify("Sample data reset.")
  }

  return (
    <PreviewContext value={{ students, auditEvents, settings, reassignStudents, updateSettings, resetPreview, notify }}>
      <Fragment key={resetVersion}>{children}</Fragment>
      {toast && (
        <div className="fixed right-4 bottom-4 z-[70] flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-lg sm:max-w-md">
          <p key={toast.id} role="status" aria-live="polite" aria-atomic="true" className="text-sm">{toast.message}</p>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss message" onClick={() => setToast(null)}><XIcon /></Button>
        </div>
      )}
    </PreviewContext>
  )
}
