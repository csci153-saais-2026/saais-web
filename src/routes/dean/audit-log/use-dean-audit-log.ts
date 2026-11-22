import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiSchema } from "@/lib/api";
import { toManilaDayKey } from "@/routes/dean/audit-log/audit-date";
import { getDeanAuditLogEntries } from "@/routes/dean/audit-log/audit-log.api";
import { useDeanFaculty } from "@/routes/dean/shared/use-dean-faculty";
import type { DeanAuditAction, DeanAuditEntry } from "@/routes/dean/types";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function mapCategoryToAction(category: string): DeanAuditAction {
  if (category === "change" || category === "grade_change") return "Change";
  if (category === "auth" || category === "login") return "Sign-in";
  return "View";
}

export type MappedDeanAuditEntry = DeanAuditEntry & { dayKey: string };

function toDeanAuditEntry(
  entry: ApiSchema<"AuditLogEntry">,
): MappedDeanAuditEntry {
  const created = new Date(entry.created_at);
  const dayKey = toManilaDayKey(entry.created_at);
  const studentDisplay =
    entry.student_number || entry.student_name
      ? [entry.student_number, entry.student_name].filter(Boolean).join(" · ")
      : "—";

  return {
    id: entry.id,
    timestamp: Number.isNaN(created.getTime())
      ? entry.created_at
      : dateFormatter.format(created),
    actor: entry.actor_name,
    action: mapCategoryToAction(entry.action_category),
    student: studentDisplay,
    studentId: entry.student_id,
    studentNumber: entry.student_number,
    details: entry.details_summary,
    dayKey,
  };
}

export function useDeanAuditLog() {
  const entriesQuery = useQuery({
    queryKey: ["dean", "audit-log"],
    queryFn: ({ signal }) => getDeanAuditLogEntries(signal),
  });

  const facultyQuery = useDeanFaculty();

  const entries = useMemo(
    () => (entriesQuery.data ?? []).map(toDeanAuditEntry),
    [entriesQuery.data],
  );

  const isLoading = entriesQuery.isLoading || facultyQuery.isLoading;
  const isError = entriesQuery.isError || facultyQuery.isError;
  const isFacultyUnavailable =
    !isLoading && !isError && !facultyQuery.facultyName;

  const refetch = () => {
    void Promise.all([entriesQuery.refetch(), facultyQuery.refetch()]);
  };

  return {
    entries,
    hasData: Boolean(entriesQuery.data),
    facultyName: facultyQuery.facultyName,
    isLoading,
    isError,
    isFacultyUnavailable,
    refetch,
  };
}
