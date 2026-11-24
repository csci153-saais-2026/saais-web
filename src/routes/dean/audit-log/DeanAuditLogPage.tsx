import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { DEAN_AUDIT_SKELETON_SAMPLE } from "../dean.skeleton-samples";
import { useMemo, useState } from "react";
import { AuditLogTable } from "@/components/features/audit-log-table";
import type { Column } from "@/components/features/data-table-panel";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { FacultyAuditFilters } from "@/routes/dean/audit-log/FacultyAuditFilters";
import { useDeanAuditLog } from "@/routes/dean/audit-log/use-dean-audit-log";
import { DeanQueryState } from "@/routes/dean/shared/DeanQueryState";
import type { DeanAuditAction, DeanAuditEntry } from "@/routes/dean/types";

const actionStatus: Record<DeanAuditAction, Status> = {
  View: "enrolled",
  Change: "passed",
  "Sign-in": "disabled",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function AuditTimestamp({ row }: { row: DeanAuditEntry }) {
  const date = row.occurredAt ? new Date(row.occurredAt) : null;
  if (!date || Number.isNaN(date.getTime())) return <>{row.timestamp}</>;
  return (
    <time dateTime={row.occurredAt}>
      <span className="block">{dateFormatter.format(date)}</span>
      <span className="block text-xs text-muted-foreground">
        {timeFormatter.format(date).toUpperCase()}
      </span>
    </time>
  );
}

const wrapCell = "min-w-0 whitespace-normal wrap-break-word";

const auditColumns: Column<DeanAuditEntry>[] = [
  {
    header: "Timestamp",
    className: "font-mono text-xs text-muted-foreground",
    cell: (row) => <AuditTimestamp row={row} />,
  },
  {
    header: "Person",
    className: "font-medium",
    cell: (row) => (
      <span className={wrapCell} title={row.actor}>
        {row.actor}
      </span>
    ),
  },
  {
    header: "Action",
    cell: (row) => (
      <StatusBadge status={actionStatus[row.action]}>{row.action}</StatusBadge>
    ),
  },
  {
    header: "Student",
    cell: (row) => (
      <span className={wrapCell} title={row.student}>
        {row.student}
      </span>
    ),
  },
  {
    header: "Details",
    className: wrapCell,
    cell: (row) => row.details,
  },
];

export default function DeanAuditLogPage() {
  const [person, setPerson] = useState("");
  const [student, setStudent] = useState("");
  const [action, setAction] = useState("all");
  const [fromDate, setFromDate] = useState("");

  const {
    entries: loadedEntries,
    hasData,
    facultyName,
    isLoading,
    isError,
    isFacultyUnavailable,
    refetch,
  } = useDeanAuditLog();
  // While loading, the skeleton is measured from sample rows.
  const entries = isLoading ? DEAN_AUDIT_SKELETON_SAMPLE : loadedEntries;

  const filteredEntries = useMemo(() => {
    const personQuery = person.trim().toLowerCase();
    const studentQuery = student.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesPerson =
        personQuery === "" || entry.actor.toLowerCase().includes(personQuery);
      const matchesStudent =
        studentQuery === "" ||
        entry.student.toLowerCase().includes(studentQuery);
      const matchesAction = action === "all" || entry.action === action;
      const matchesDate = fromDate === "" || entry.dayKey >= fromDate;

      return matchesPerson && matchesStudent && matchesAction && matchesDate;
    });
  }, [entries, person, student, action, fromDate]);

  const handleReset = () => {
    setPerson("");
    setStudent("");
    setAction("all");
    setFromDate("");
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Audit log" subtitle={facultyName ?? undefined} />

      {(!hasData && !isLoading) || isError || isFacultyUnavailable ? (
        <DeanQueryState
          isLoading={isLoading}
          isError={isError}
          isEmpty={isFacultyUnavailable}
          label="the audit log"
          emptyTitle="Faculty unavailable"
          emptyMessage="Faculty information is unavailable for this account."
          onRetry={refetch}
        />
      ) : (
        <AccountSkeleton
          id="dean-audit-log"
          loading={isLoading}
          measured
          label="Loading the audit log…"
        >
          <Panel
            title="Audit events"
            description={`${filteredEntries.length} ${filteredEntries.length === 1 ? "record" : "records"}`}
            flush
          >
            <FacultyAuditFilters
              person={person}
              onPersonChange={setPerson}
              student={student}
              onStudentChange={setStudent}
              action={action}
              onActionChange={setAction}
              fromDate={fromDate}
              onFromDateChange={setFromDate}
              onReset={handleReset}
            />

            <AuditLogTable
              columns={auditColumns}
              rows={filteredEntries}
              rowKey={(row) => row.id}
              ariaLabel="Faculty audit log"
            />
          </Panel>
        </AccountSkeleton>
      )}
    </div>
  );
}
