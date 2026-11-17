import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { PageHeading } from "@/components/features/page-heading"
import type { ApiSchema } from "@/lib/api"
import { getDeanAuditLogEntries } from "@/routes/dean/api/dean.api"
import { DeanAuditActionPill } from "@/routes/dean/components/DeanAuditActionPill"
import { DeanQueryState } from "@/routes/dean/components/DeanQueryState"
import { FacultyAuditFilters } from "@/routes/dean/components/FacultyAuditFilters"
import type { DeanAuditAction, DeanAuditEntry } from "@/routes/dean/types"

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function mapCategoryToAction(category: string): DeanAuditAction {
  if (category === "change" || category === "grade_change") return "Change"
  if (category === "auth" || category === "login") return "Sign-in"
  return "View"
}

function toDeanAuditEntry(entry: ApiSchema<"AuditLogEntry">): DeanAuditEntry & { dayKey: string } {
  const created = new Date(entry.created_at)
  const dayKey = Number.isNaN(created.getTime())
    ? ""
    : created.toISOString().slice(0, 10)
  const studentDisplay =
    entry.student_number || entry.student_name
      ? [entry.student_number, entry.student_name].filter(Boolean).join(" · ")
      : "—"

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
  }
}

export default function DeanAuditLogPage() {
  const [person, setPerson] = useState("")
  const [student, setStudent] = useState("")
  const [action, setAction] = useState("all")
  const [fromDate, setFromDate] = useState("")

  const auditQuery = useQuery({
    queryKey: ["dean", "audit-log"],
    queryFn: getDeanAuditLogEntries,
  })

  const entries = useMemo(
    () => (auditQuery.data ?? []).map(toDeanAuditEntry),
    [auditQuery.data],
  )

  const filteredEntries = useMemo(() => {
    const personQuery = person.trim().toLowerCase()
    const studentQuery = student.trim().toLowerCase()

    return entries.filter((entry) => {
      const matchesPerson =
        personQuery === "" || entry.actor.toLowerCase().includes(personQuery)
      const matchesStudent =
        studentQuery === "" || entry.student.toLowerCase().includes(studentQuery)
      const matchesAction = action === "all" || entry.action === action
      const matchesDate = fromDate === "" || entry.dayKey >= fromDate

      return matchesPerson && matchesStudent && matchesAction && matchesDate
    })
  }, [entries, person, student, action, fromDate])

  const handleReset = () => {
    setPerson("")
    setStudent("")
    setAction("all")
    setFromDate("")
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Audit log"
        subtitle="Immutable record of faculty report exports, drill-downs, and student record views."
      />

      {!auditQuery.data ? (
        <DeanQueryState
          isLoading={auditQuery.isLoading}
          isError={auditQuery.isError}
          label="the audit log"
          onRetry={() => void auditQuery.refetch()}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-card">
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
          </div>

          <DataTablePanel
            title="Audit events"
            description={`${filteredEntries.length} ${filteredEntries.length === 1 ? "record" : "records"}`}
            rows={filteredEntries}
            rowKey={(row) => row.id}
            empty="No audit records match these filters."
            columns={[
              {
                header: "When",
                cell: (row) => (
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.timestamp}
                  </span>
                ),
              },
              {
                header: "Who",
                cell: (row) => <span className="font-medium">{row.actor}</span>,
              },
              {
                header: "Action",
                cell: (row) => <DeanAuditActionPill action={row.action} />,
              },
              {
                header: "Student",
                cell: (row) => row.student,
              },
              {
                header: "Details",
                cell: (row) => row.details,
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}
