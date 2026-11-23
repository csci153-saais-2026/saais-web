import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useState } from "react";
import { DataTablePanel } from "@/components/features/data-table-panel";
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
import type { AuditAction, AuditEvent } from "./audit-types";
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
          <DataTablePanel<AuditEvent>
            title="Department activity"
            description="Record views are logged alongside changes and sign-ins."
            toolbar={
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
            }
            rows={events}
            rowKey={(event) => event.id}
            columns={[
              {
                header: "Timestamp",
                className: "whitespace-normal",
                cell: (event) => (
                  <time dateTime={event.timestamp}>
                    <span className="block">
                      {dateFormatter.format(new Date(event.timestamp))}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {timeFormatter
                        .format(new Date(event.timestamp))
                        .toUpperCase()}
                    </span>
                  </time>
                ),
              },
              {
                header: "Person",
                className: "whitespace-normal",
                cell: (event) => (
                  <span className="min-w-0">{event.person}</span>
                ),
              },
              {
                header: "Action",
                cell: (event) => (
                  <StatusBadge status={actionStatus[event.action]}>
                    {event.action}
                  </StatusBadge>
                ),
              },
              {
                header: "Student / record",
                className: "whitespace-normal",
                cell: (event) => (
                  <span className="min-w-0 wrap-break-word">
                    {event.studentNumber || event.studentName
                      ? [event.studentNumber, event.studentName]
                          .filter(Boolean)
                          .join(" · ")
                      : "—"}
                  </span>
                ),
              },
              {
                header: "Details",
                className: "whitespace-normal",
                cell: (event) => (
                  <span className="min-w-0 wrap-break-word">
                    {event.details}
                  </span>
                ),
              },
            ]}
            empty={
              dateError
                ? "Choose a valid date range to view events."
                : "No entries match these filters."
            }
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span role="status" aria-live="polite" aria-atomic="true">
                  {events.length} matching{" "}
                  {events.length === 1 ? "event" : "events"} of{" "}
                  {auditEvents.length}
                </span>
                <span>DCST department scope</span>
              </div>
            }
          />
        </>
      )}
    </AccountSkeleton>
  );
}
