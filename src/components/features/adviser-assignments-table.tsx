import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeanStudentSummary } from "@/routes/dean/types";

type DepartmentAssignment = {
  id: string;
  name: string;
  studentNumber: string;
  curriculum: string;
  adviser: string;
  adviserSince: string;
  previousAdviser?: string;
  scheduledAssignment?: {
    adviser: string;
    effectiveDate: string;
    reason: string;
  };
  selected: boolean;
};

type DepartmentAssignmentsProps = {
  variant: "department-head";
  assignments: DepartmentAssignment[];
  selectAll: boolean | "indeterminate";
  onSelectAll: (checked: boolean) => void;
  onSelectAssignment: (id: string, checked: boolean) => void;
};

type DeanAssignmentsProps = {
  variant?: "dean";
  students: DeanStudentSummary[];
  onSelectStudent?: (student: DeanStudentSummary) => void;
};

const TH =
  "h-auto bg-secondary px-3.5 py-2.5 text-[11.5px] font-semibold tracking-[0.09em] text-muted-2 uppercase";
const TD = "px-3.5 py-[11px] text-[13.5px] leading-normal";

function DepartmentAssignmentRows({
  assignments,
  selectAll,
  onSelectAll,
  onSelectAssignment,
}: DepartmentAssignmentsProps) {
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead className={`${TH} w-20`}>
            <Checkbox
              aria-label="Select all visible students"
              disabled={assignments.length === 0}
              checked={selectAll}
              onCheckedChange={(checked) => onSelectAll(checked === true)}
              className="data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:before:absolute data-[state=indeterminate]:before:h-px data-[state=indeterminate]:before:w-2 data-[state=indeterminate]:before:bg-primary-foreground data-[state=indeterminate]:[&_svg]:hidden"
            />
          </TableHead>
          <TableHead className={TH}>Student</TableHead>
          <TableHead className={TH}>Current adviser</TableHead>
          <TableHead className={TH}>Since</TableHead>
          <TableHead className={TH}>Previous adviser</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((student) => (
          <TableRow
            key={student.id}
            className="cursor-pointer border-line-soft hover:bg-line-soft"
            onClick={() => onSelectAssignment(student.id, !student.selected)}
            data-state={student.selected ? "selected" : undefined}
          >
            <TableCell
              label="Select"
              className={`${TD} w-20`}
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                aria-label={`Select ${student.name}`}
                checked={student.selected}
                onCheckedChange={(checked) =>
                  onSelectAssignment(student.id, checked === true)
                }
              />
            </TableCell>
            <TableCell label="Student" className={`${TD} whitespace-normal`}>
              <div className="min-w-0">
                <span
                  className="block max-w-64 truncate text-[13.5px] font-semibold"
                  title={student.name}
                >
                  {student.name}
                </span>
                <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                  {student.studentNumber}
                </span>
                <Badge variant="secondary" className="mt-1 gap-1.5 rounded-sm">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-current"
                  />
                  {student.curriculum}
                </Badge>
              </div>
            </TableCell>
            <TableCell
              label="Current adviser"
              className={`${TD} whitespace-normal`}
            >
              <div className="min-w-0">
                <span>{student.adviser}</span>
                {student.scheduledAssignment && (
                  <p className="mt-1 max-w-64 text-xs text-muted-foreground">
                    Scheduled: {student.scheduledAssignment.adviser} from{" "}
                    {student.scheduledAssignment.effectiveDate}
                    {student.scheduledAssignment.reason && (
                      <span className="block">
                        {student.scheduledAssignment.reason}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell label="Since" className={TD}>
              {student.adviserSince}
            </TableCell>
            <TableCell
              label="Previous adviser"
              className={`${TD} whitespace-normal`}
            >
              <span className="min-w-0">{student.previousAdviser || "—"}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}

function DeanAssignmentRows({
  students,
  onSelectStudent,
}: DeanAssignmentsProps) {
  return (
    <>
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
    </>
  );
}

export function AdviserAssignmentsTable(
  props: DepartmentAssignmentsProps | DeanAssignmentsProps,
) {
  const isDepartmentHead = props.variant === "department-head";
  return (
    <Table
      responsive
      aria-label={
        isDepartmentHead ? "Student adviser assignments" : "Adviser assignments"
      }
    >
      {isDepartmentHead ? (
        <DepartmentAssignmentRows {...props} />
      ) : (
        <DeanAssignmentRows {...props} />
      )}
    </Table>
  );
}
