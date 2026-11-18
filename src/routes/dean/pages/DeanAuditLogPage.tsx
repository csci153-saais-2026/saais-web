import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ApiSchema } from "@/lib/api"
import { getDeanAuditLogEntries, getDeanFaculties } from "@/routes/dean/api/dean.api"
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
    queryFn: async () => {
      const [entries, faculties] = await Promise.all([
        getDeanAuditLogEntries(),
        getDeanFaculties(),
      ])
      return { entries, faculties }
    },
  })

  const facultyName = useMemo(
    () => auditQuery.data?.faculties[0]?.name ?? "Faculty of Computing",
    [auditQuery.data],
  )

  const entries = useMemo(
    () => (auditQuery.data?.entries ?? []).map(toDeanAuditEntry),
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
        subtitle={`${facultyName} · read-only, cannot be edited`}
      />

      {!auditQuery.data ? (
        <DeanQueryState
          isLoading={auditQuery.isLoading}
          isError={auditQuery.isError}
          label="the audit log"
          onRetry={() => void auditQuery.refetch()}
        />
      ) : (
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

          <Table responsive>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length > 0 ? (
                filteredEntries.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell label="When" className="font-mono text-xs text-muted-foreground">
                      {row.timestamp}
                    </TableCell>
                    <TableCell label="Who" className="font-medium">
                      {row.actor}
                    </TableCell>
                    <TableCell label="Action">
                      <DeanAuditActionPill action={row.action} />
                    </TableCell>
                    <TableCell label="Student">{row.student}</TableCell>
                    <TableCell label="Details">{row.details}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No audit records match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  )
}
