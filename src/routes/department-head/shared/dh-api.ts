import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import { getRoster } from "@/routes/adviser/advisees/advisees.api";
import type { AuditAction, AuditEvent } from "../audit-log/audit-types";
import type { BackupScope, SettingsState } from "../settings/settings-types";
import { todayInManila } from "./dh-utils";
import type { DirectoryStudent } from "./students-types";

export type DepartmentAdviser = { id: string; name: string; email: string };

const PAGE = 100;

async function allPages<T>(
  load: (offset: number) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= 100_000; offset += PAGE) {
    const page = await load(offset);
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
  throw new Error("The collection exceeds the supported page range.");
}

const ORDINALS = ["1st", "2nd", "3rd"];
function yearLabel(level: number) {
  return `${ORDINALS[level - 1] ?? `${level}th`} year`;
}

export async function getDirectoryStudents(): Promise<DirectoryStudent[]> {
  const [roster, assignments] = await Promise.all([
    getRoster("all"),
    allPages((offset) =>
      apiClient
        .GET("/rest/v1/adviser_assignment", {
          params: {
            query: {
              select: "*",
              order: "start_date.asc,id.asc",
              limit: PAGE,
              offset,
            },
          },
        })
        .then(unwrapApiResult),
    ),
  ]);
  const today = todayInManila();
  return roster.map((student) => {
    const history = assignments.filter(
      (row) => row.student_id === student.student_id,
    );
    const current = history
      .filter(
        (row) =>
          row.start_date <= today && (!row.end_date || row.end_date > today),
      )
      .at(-1);
    const scheduled = history.filter((row) => row.start_date > today).at(0);
    const previous = history
      .filter(
        (row) =>
          row.end_date && row.end_date <= today && row.id !== current?.id,
      )
      .at(-1);
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
        ? {
            adviser: scheduled.adviser_name ?? "",
            effectiveDate: scheduled.start_date,
            reason: "",
          }
        : undefined,
    };
  });
}

/**
 * Active advisers of the head's own departments. The Data API never returns
 * `profile.roles`, so the adviser role is read from `role_assignment`.
 */
export async function getDepartmentAdvisers(
  departmentIds: readonly string[],
): Promise<DepartmentAdviser[]> {
  if (!departmentIds.length)
    throw new Error("An active department head assignment is required.");
  const assignments = await allPages((offset) =>
    apiClient
      .GET("/rest/v1/role_assignment", {
        params: {
          query: {
            role: postgrestFilter.eq("adviser"),
            department_id: postgrestFilter.inList(departmentIds),
            select: "id,profile_id,role,department_id",
            order: "id.asc",
            limit: PAGE,
            offset,
          },
        },
      })
      .then(unwrapApiResult),
  );
  const ids = [...new Set(assignments.map((row) => row.profile_id))];
  const advisers: DepartmentAdviser[] = [];
  for (let start = 0; start < ids.length; start += 50) {
    const profiles = unwrapApiResult(
      await apiClient.GET("/rest/v1/profile", {
        params: {
          query: {
            id: postgrestFilter.inList(ids.slice(start, start + 50)),
            status: postgrestFilter.eq("active"),
            select: "id,full_name,email,status,department_id",
            order: "id.asc",
            limit: PAGE,
          },
        },
      }),
    );
    for (const profile of profiles) {
      // Reassignment is also authorized by the adviser's own department.
      if (
        profile.department_id &&
        departmentIds.includes(profile.department_id)
      )
        advisers.push({
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
        });
    }
  }
  return advisers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function reassignStudents(input: {
  studentIds: string[];
  adviserId: string;
  effectiveDate: string;
  reason: string;
}) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/adviser-assignments/bulk-reassign", {
      body: {
        student_ids: input.studentIds,
        adviser_id: input.adviserId,
        effective_since: input.effectiveDate,
        reason: input.reason,
      },
    }),
  );
}

const ACTIONS: Partial<Record<ApiSchema<"AuditActionCategory">, AuditAction>> =
  {
    view: "View",
    record_view: "View",
    export: "View",
    sign_in: "Sign-in",
  };

export const DEPARTMENT_AUDIT_LIMIT = 1000;

function auditDateQuery({ from, to }: { from: string; to: string }) {
  const start = from && new Date(`${from}T00:00:00+08:00`).toISOString();
  const end =
    to &&
    new Date(Date.parse(`${to}T00:00:00+08:00`) + 86_400_000).toISOString();
  if (start && end)
    return { and: `(created_at.gte.${start},created_at.lt.${end})` };
  if (start) return { created_at: `gte.${start}` };
  if (end) return { created_at: `lt.${end}` };
  return {};
}

/** Read the latest department events, or retain paged history for a single student. */
export async function getAuditEvents(
  studentId?: string,
  range = { from: "", to: "" },
): Promise<AuditEvent[]> {
  if (range.from && range.to && range.from > range.to) return [];
  const readPage = (limit: number, offset: number) =>
    apiClient
      .GET("/rest/v1/audit_log_entry", {
        params: {
          query: {
            ...(studentId ? { student_id: postgrestFilter.eq(studentId) } : {}),
            ...auditDateQuery(range),
            order: "created_at.desc,id.desc",
            limit,
            offset,
          },
        },
      })
      .then(unwrapApiResult);
  const rows = await (studentId
    ? allPages((offset) => readPage(PAGE, offset))
    : readPage(DEPARTMENT_AUDIT_LIMIT, 0));
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.created_at,
    person: row.actor_name ?? "System",
    action: (row.action_category && ACTIONS[row.action_category]) || "Change",
    studentName: row.student_name ?? undefined,
    studentNumber: row.student_number ?? undefined,
    record: row.target_label ?? row.entity_type,
    details: row.details_summary ?? row.action,
  }));
}

function toSettings(row: ApiSchema<"SystemSettings">): SettingsState {
  return {
    thresholds: {
      warning: row.warning_pct,
      probation: row.probation_pct,
      dismissal: row.dismissal_pct,
    },
    senderEmail: row.sender_email,
    latestBackup: row.last_backup_at
      ? {
          completedAt: row.last_backup_at,
          reference: row.last_backup_reference ?? "",
          location: row.last_backup_location ?? "",
          scope: (row.last_backup_scope ?? "department_records") as BackupScope,
        }
      : null,
  };
}

/** A head can read both their department's row and the institution default. */
export async function getSettings(
  departmentIds: readonly string[] = [],
): Promise<SettingsState> {
  const rows = unwrapApiResult(
    await apiClient.GET("/rest/v1/system_settings", {
      params: {
        query: { order: "department_id.asc.nullslast,id.asc", limit: 1000 },
      },
    }),
  );
  const row =
    rows.find(
      (item) =>
        item.department_id && departmentIds.includes(item.department_id),
    ) ??
    rows.find((item) => item.department_id == null) ??
    rows[0];
  if (!row) throw new Error("Department settings are unavailable.");
  return toSettings(row);
}

export async function saveThresholds(thresholds: SettingsState["thresholds"]) {
  return toSettings(
    unwrapApiResult(
      await apiClient.PUT("/functions/v1/settings", {
        body: {
          warning_pct: thresholds.warning,
          probation_pct: thresholds.probation,
          dismissal_pct: thresholds.dismissal,
        },
      }),
    ),
  );
}

export async function saveSenderEmail(senderEmail: string) {
  return toSettings(
    unwrapApiResult(
      await apiClient.PUT("/functions/v1/settings", {
        body: { sender_email: senderEmail },
      }),
    ),
  );
}

export async function recordBackup(backup: {
  completedAt: string;
  reference: string;
  location: string;
  scope: BackupScope;
}) {
  return toSettings(
    unwrapApiResult(
      await apiClient.POST("/functions/v1/settings/record-backup", {
        body: {
          completed_at: backup.completedAt,
          backup_reference: backup.reference,
          storage_location: backup.location,
          scope: backup.scope,
        },
      }),
    ),
  );
}

/** Most recent time the department closed grade encoding for a term, if ever. */
export async function getLastEncodingClosure(
  departmentIds: readonly string[],
): Promise<string | null> {
  if (!departmentIds.length) return null;
  const rows = unwrapApiResult(
    await apiClient.GET("/rest/v1/department_term_encoding", {
      params: {
        query: {
          department_id: postgrestFilter.inList(departmentIds),
          is_closed: postgrestFilter.eq(true),
          order: "closed_at.desc.nullslast",
          limit: 1,
        },
      },
    }),
  );
  return rows[0]?.closed_at ?? null;
}
