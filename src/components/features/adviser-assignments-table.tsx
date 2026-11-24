import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeanStudentSummary } from "@/routes/dean/types";

export function AdviserAssignmentsTable({
  students,
  onSelectStudent,
}: {
  students: DeanStudentSummary[];
  onSelectStudent?: (student: DeanStudentSummary) => void;
}) {
  return (
    <Table responsive aria-label="Adviser assignments">
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Student no.</TableHead>
          <TableHead>Curriculum</TableHead>
          <TableHead>Current adviser</TableHead>
          <TableHead>Assignment status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.length ? (
          students.map((student) => (
            <TableRow key={student.studentId}>
              <TableCell label="Student" className="font-medium">
                {student.name}
              </TableCell>
              <TableCell label="Student no." className="font-mono text-xs">
                {student.studentNumber}
              </TableCell>
              <TableCell label="Curriculum">{student.curriculum}</TableCell>
              <TableCell label="Current adviser">
                {student.adviser || "—"}
              </TableCell>
              <TableCell label="Assignment status">
                <Badge variant="secondary">
                  {student.hasAdviser ? "Assigned" : "Unassigned"}
                </Badge>
                {onSelectStudent && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-2 h-auto px-0 py-1 font-semibold"
                    onClick={() => onSelectStudent(student)}
                  >
                    Open<span className="sr-only"> {student.name}</span>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={5}
              className="py-10 text-center text-muted-foreground"
            >
              No adviser assignments to show.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
