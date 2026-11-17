import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"
import { getRoster } from "@/routes/adviser/advisees/advisees.api"
import type { AuditAction, AuditEvent } from "../audit-log/audit-types"
import type { BackupScope, SettingsState } from "../settings/settings-types"
import { todayInManila } from "./dh-utils"
import type { DirectoryStudent } from "./students-types"

export type DepartmentAdviser = { id: string; name: string }

const PAGE = 100

async function allPages<T>(load: (offset: number) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE) {
    const page = await load(offset)
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

const ORDINALS = ["1st", "2nd", "3rd"]
function yearLabel(level: number) {
  return `${ORDINALS[level - 1] ?? `${level}th`} year`
}

export async function getDirectoryStudents(): Promise<DirectoryStudent[]> {
  const [roster, assignments] = await Promise.all([
    getRoster("all"),
    allPages((offset) => apiClient.GET("/rest/v1/adviser_assignment", {
      params: { query: { select: "*", order: "start_date.asc", limit: PAGE, offset } },
    }).then(unwrapApiResult)),
  ])
  const today = todayInManila()
  return roster.map((student) => {
    const history = assignments.filter((row) => row.student_id === student.student_id)
    const current = history.filter((row) => row.start_date <= today && (!row.end_date || row.end_date > today)).at(-1)
    const scheduled = history.filter((row) => row.start_date > today).at(0)
    const previous = history.filter((row) => row.end_date && row.end_date <= today && row.id !== current?.id).at(-1)
    return {
      id: student.student_id,
      name: student.full_name,
      studentNumber: student.student_number,
      email: student.email,
      curriculum: student.curriculum_label,
      yearStanding: yearLabel(student.year_level),
      adviser: current?.adviser_name ?? "Unassigned",
      adviserSince: current?.start_date,
      previousAdviser: previous?.adviser_name ?? undefined,
      scheduledAssignment: scheduled
        ? { adviser: scheduled.adviser_name ?? "", effectiveDate: scheduled.start_date, reason: "" }
        : undefined,
    }
  })
}

export async function getDepartmentAdvisers(): Promise<DepartmentAdviser[]> {
  const [roster, profiles] = await Promise.all([
    getRoster("all"),
    allPages((offset) => apiClient.GET("/rest/v1/profile", {
      params: { query: { limit: PAGE, offset } },
    }).then(unwrapApiResult)),
  ])
  const departments = new Set(roster.map((student) => student.department_id))
  return profiles
    .filter((profile) => profile.status === "active" && profile.roles?.includes("adviser") && !!profile.department_id && departments.has(profile.department_id))
    .map((profile) => ({ id: profile.id, name: profile.full_name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function reassignStudents(input: { studentIds: string[]; adviserId: string; effectiveDate: string; reason: string }) {
  return unwrapApiResult(await apiClient.POST("/functions/v1/adviser-assignments/bulk-reassign", {
    body: { student_ids: input.studentIds, adviser_id: input.adviserId, effective_since: input.effectiveDate, reason: input.reason },
  }))
}

const ACTIONS: Partial<Record<ApiSchema<"AuditActionCategory">, AuditAction>> = {
  view: "View", record_view: "View", export: "View", sign_in: "Sign-in",
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  const rows = await allPages((offset) => apiClient.GET("/rest/v1/audit_log_entry", {
    params: { query: { order: "created_at.desc", limit: PAGE, offset } },
  }).then(unwrapApiResult))
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.created_at,
    person: row.actor_name ?? "System",
    action: (row.action_category && ACTIONS[row.action_category]) || "Change",
    studentName: row.student_name ?? undefined,
    studentNumber: row.student_number ?? undefined,
    record: row.target_label ?? row.entity_type,
    details: row.details_summary ?? row.action,
  }))
}

function toSettings(row: ApiSchema<"SystemSettings">): SettingsState {
  return {
    thresholds: { warning: row.warning_pct, probation: row.probation_pct, dismissal: row.dismissal_pct },
    senderEmail: row.sender_email,
    latestBackup: row.last_backup_at ? {
      completedAt: row.last_backup_at,
      reference: row.last_backup_reference ?? "",
      location: row.last_backup_location ?? "",
      scope: (row.last_backup_scope ?? "department_records") as BackupScope,
    } : null,
  }
}

export async function getSettings(): Promise<SettingsState> {
  const rows = unwrapApiResult(await apiClient.GET("/rest/v1/system_settings", { params: { query: { limit: 1 } } }))
  if (!rows[0]) throw new Error("Department settings are unavailable.")
  return toSettings(rows[0])
}

export async function saveThresholds(thresholds: SettingsState["thresholds"]) {
  return toSettings(unwrapApiResult(await apiClient.PUT("/functions/v1/settings", {
    body: { warning_pct: thresholds.warning, probation_pct: thresholds.probation, dismissal_pct: thresholds.dismissal },
  })))
}

export async function saveSenderEmail(senderEmail: string) {
  return toSettings(unwrapApiResult(await apiClient.PUT("/functions/v1/settings", { body: { sender_email: senderEmail } })))
}

export async function recordBackup(backup: { completedAt: string; reference: string; location: string; scope: BackupScope }) {
  return toSettings(unwrapApiResult(await apiClient.POST("/functions/v1/settings/record-backup", {
    body: { completed_at: backup.completedAt, backup_reference: backup.reference, storage_location: backup.location, scope: backup.scope },
  })))
}

/** Most recent time the department closed grade encoding for a term, if ever. */
export async function getLastEncodingClosure(): Promise<string | null> {
  const rows = unwrapApiResult(await apiClient.GET("/rest/v1/department_term_encoding", { params: { query: { limit: PAGE } } }))
  const closed = rows.filter((row) => row.is_closed).map((row) => row.closed_at).filter((value): value is string => !!value)
  return closed.sort().at(-1) ?? null
}
