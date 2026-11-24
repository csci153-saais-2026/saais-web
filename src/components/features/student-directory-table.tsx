import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DeanStudentSummary } from "@/routes/dean/types";

export function StudentDirectoryTable({
  students,
  totalCount = students.length,
  onSelectStudent,
  onResetFilters,
}: {
  students: DeanStudentSummary[];
  totalCount?: number;
  onSelectStudent: (student: DeanStudentSummary) => void;
  onResetFilters?: () => void;
}) {
  const countLabel = students.length === totalCount
    ? `${students.length} ${students.length === 1 ? "student" : "students"}`
    : `Showing ${students.length} of ${totalCount} students`;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div><h2 className="font-semibold">Student directory</h2><p className="text-sm text-muted-foreground">{countLabel}</p></div>
        <span aria-live="polite" className="font-mono text-xs text-muted-foreground">{students.length} {students.length === 1 ? "student" : "students"}</span>
      </div>
      <Table responsive aria-label="Student directory">
        <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Student no.</TableHead><TableHead>Department</TableHead><TableHead>Curriculum</TableHead><TableHead>Adviser</TableHead></TableRow></TableHeader>
        <TableBody>
          {students.length ? students.map((student) => (
            <TableRow key={student.studentNumber} tabIndex={0} role="button" aria-label={`Open record for ${student.name}`} className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelectStudent(student)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectStudent(student); } }}>
              <TableCell label="Student" className="font-medium text-primary"><span className="block max-w-56 truncate" title={student.name}>{student.name}</span></TableCell>
              <TableCell label="Student no." className="font-mono text-xs">{student.studentNumber}</TableCell>
              <TableCell label="Department"><span className="block max-w-56 truncate" title={student.department}>{student.department}</span></TableCell>
              <TableCell label="Curriculum"><span className="block max-w-48 truncate" title={student.curriculum}>{student.curriculum}</span></TableCell>
              <TableCell label="Adviser"><span className="block max-w-56 truncate" title={student.adviser}>{student.adviser}</span></TableCell>
            </TableRow>
          )) : <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground"><div className="flex flex-col items-center gap-3"><span>No students match these filters.</span>{onResetFilters && <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>Reset filters</Button>}</div></TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
