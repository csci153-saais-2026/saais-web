import { useMemo, useState } from "react"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { PageHeading } from "@/components/features/page-heading"
import { SampleFooter } from "@/components/features/sample-footer"
import { DeanAuditActionPill } from "@/routes/dean/components/DeanAuditActionPill"
import { FacultyAuditFilters } from "@/routes/dean/components/FacultyAuditFilters"
import { useDeanAudit } from "@/routes/dean/context/DeanAuditContext"

const MONTHS: readonly string[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
]

function extractAuditDay(timestamp: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(timestamp)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const named = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})/.exec(timestamp)
  if (!named) return ""

  const monthIdx = MONTHS.indexOf(named[2].toLowerCase())
  if (monthIdx < 0) return ""

  return `${named[3]}-${String(monthIdx + 1).padStart(2, "0")}-${named[1].padStart(2, "0")}`
}

export default function DeanAuditLogPage() {
  const { entries } = useDeanAudit()
  const [person, setPerson] = useState("")
  const [student, setStudent] = useState("")
  const [action, setAction] = useState("all")
  const [fromDate, setFromDate] = useState("")

  const filteredEntries = useMemo(() => {
    const personQuery = person.trim().toLowerCase()
    const studentQuery = student.trim().toLowerCase()

    return entries.filter((entry) => {
      const matchesPerson =
        personQuery === "" || entry.actor.toLowerCase().includes(personQuery)
      const matchesStudent =
        studentQuery === "" || entry.student.toLowerCase().includes(studentQuery)
      const matchesAction = action === "all" || entry.action === action
      const matchesDate =
        fromDate === "" || extractAuditDay(entry.timestamp) >= fromDate

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

      <SampleFooter>Fictional sample records · Reference date: 28 October 2026</SampleFooter>
    </div>
  )
}
