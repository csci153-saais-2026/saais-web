import { useMemo, useState } from "react";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeanAuditActionPill } from "@/routes/dean/audit-log/DeanAuditActionPill";
import { FacultyAuditFilters } from "@/routes/dean/audit-log/FacultyAuditFilters";
import { useDeanAuditLog } from "@/routes/dean/audit-log/use-dean-audit-log";
import { DeanQueryState } from "@/routes/dean/shared/DeanQueryState";

export default function DeanAuditLogPage() {
  const [person, setPerson] = useState("");
  const [student, setStudent] = useState("");
  const [action, setAction] = useState("all");
  const [fromDate, setFromDate] = useState("");

  const {
    entries,
    hasData,
    facultyName,
    isLoading,
    isError,
    isFacultyUnavailable,
    refetch,
  } = useDeanAuditLog();

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

      {!hasData || isLoading || isError || isFacultyUnavailable ? (
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
                    <TableCell
                      label="When"
                      className="font-mono text-xs text-muted-foreground"
                    >
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
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No audit records match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  );
}
