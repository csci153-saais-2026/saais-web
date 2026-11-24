import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useState } from "react";
import type { Column } from "@/components/features/data-table-panel";
import { AuditLogTable } from "@/components/features/audit-log-table";
import { Panel } from "@/components/features/panel";
import { FormField } from "@/components/features/form-field";
import { PageHeading } from "@/components/features/page-heading";
import { SearchInput } from "@/components/features/search-input";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPTY_AUDIT_FILTERS, filterAuditEvents } from "./audit-model";
import type { AuditAction } from "./audit-types";
import { useAuditEvents } from "../shared/dh-queries";
import { QueryMessage } from "../shared/dh-ui";

const actionStatus: Record<AuditAction, Status> = {
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

export default function AuditLogPage() {
  const audit = useAuditEvents();
  const auditEvents = audit.data ?? [];
  const [filters, setFilters] = useState(EMPTY_AUDIT_FILTERS);
  const dateError = Boolean(
    filters.from && filters.to && filters.from > filters.to,
  );
  const events = filterAuditEvents(auditEvents, filters);
  const tableRows = events.map((event) => ({
    id: event.id,
    timestamp: (
      <time dateTime={event.timestamp}>
        <span className="block">
          {dateFormatter.format(new Date(event.timestamp))}
        </span>
        <span className="block text-xs text-muted-foreground">
          {timeFormatter.format(new Date(event.timestamp)).toUpperCase()}
        </span>
      </time>
    ),
    person: event.person,
    action: (
      <StatusBadge status={actionStatus[event.action]}>
        {event.action}
      </StatusBadge>
    ),
    student:
      [event.studentNumber, event.studentName].filter(Boolean).join(" · ") ||
      "—",
    record: event.record,
    details: event.details,
  }));
  const tableColumns: Column<(typeof tableRows)[number]>[] = [
    {
      header: "Timestamp",
      className: "font-mono text-xs text-muted-foreground",
      cell: (row) => row.timestamp,
    },
    {
      header: "Person",
      className: "font-medium",
      cell: (row) => (
        <span
          className="min-w-0 whitespace-normal wrap-break-word"
          title={row.person}
        >
          {row.person}
        </span>
      ),
    },
    { header: "Action", cell: (row) => row.action },
    {
      header: "Student",
      cell: (row) => (
        <span
          className="min-w-0 whitespace-normal wrap-break-word"
          title={row.student}
        >
          {row.student}
        </span>
      ),
    },
    {
      header: "Record",
      className: "min-w-0 whitespace-normal wrap-break-word",
      cell: (row) => row.record,
    },
    {
      header: "Details",
      className: "min-w-0 whitespace-normal wrap-break-word",
      cell: (row) => row.details,
    },
  ];
  const hasFilters = Object.entries(filters).some(([key, value]) =>
    key === "action" ? value !== "all" : value !== "",
  );

  function changeFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const heading = (
    <PageHeading
      title="Audit log"
      subtitle="Review record views, changes, and sign-ins within your department."
    />
  );
  if (audit.isError && !audit.data)
    return (
      <>
        {heading}
        <QueryMessage query={audit} label="the audit log" />
      </>
    );

  return (
    <AccountSkeleton
      id="dh-audit-log"
      data={audit.data}
      label="Loading the audit log…"
    >
      {() => (
        <>
          {heading}
          <Panel
            title="Department activity"
            description="Record views are logged alongside changes and sign-ins."
            flush
          >
            <div className="border-b border-line-soft p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <FormField label="Person" htmlFor="audit-person">
                  <SearchInput
                    id="audit-person"
                    placeholder="Search person name"
                    value={filters.person}
                    onChange={(event) =>
                      changeFilter("person", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Student" htmlFor="audit-student">
                  <SearchInput
                    id="audit-student"
                    placeholder="Search student name or ID"
                    value={filters.student}
                    onChange={(event) =>
                      changeFilter("student", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Action" htmlFor="audit-action">
                  <Select
                    value={filters.action}
                    onValueChange={(value) => changeFilter("action", value)}
                  >
                    <SelectTrigger id="audit-action" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      {(["View", "Change", "Sign-in"] as const).map(
                        (action) => (
                          <SelectItem key={action} value={action}>
                            {action}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="From date" htmlFor="audit-from">
                  <Input
                    id="audit-from"
                    type="date"
                    value={filters.from}
                    onChange={(event) =>
                      changeFilter("from", event.target.value)
                    }
                    aria-invalid={dateError}
                    aria-describedby={
                      dateError ? "audit-date-error" : undefined
                    }
                  />
                </FormField>
                <FormField label="To date" htmlFor="audit-to">
                  <Input
                    id="audit-to"
                    type="date"
                    value={filters.to}
                    onChange={(event) => changeFilter("to", event.target.value)}
                    aria-invalid={dateError}
                    aria-describedby={
                      dateError ? "audit-date-error" : undefined
                    }
                  />
                </FormField>
                {dateError && (
                  <p
                    id="audit-date-error"
                    role="alert"
                    className="text-sm text-destructive md:col-span-2 xl:col-span-5"
                  >
                    From date must be on or before To date.
                  </p>
                )}
                <div className="flex justify-end md:col-span-2 xl:col-span-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasFilters}
                    onClick={() => setFilters(EMPTY_AUDIT_FILTERS)}
                  >
                    Reset filters
                  </Button>
                </div>
              </div>
            </div>
            <AuditLogTable
              ariaLabel="Department audit log"
              columns={tableColumns}
              rows={tableRows}
              rowKey={(row) => row.id}
              empty={
                dateError
                  ? "Choose a valid date range to view events."
                  : "No entries match these filters."
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
              <span role="status" aria-live="polite" aria-atomic="true">
                {events.length} matching{" "}
                {events.length === 1 ? "event" : "events"} of{" "}
                {auditEvents.length}
              </span>
              <span>DCST department scope</span>
            </div>
          </Panel>
        </>
      )}
    </AccountSkeleton>
  );
}
