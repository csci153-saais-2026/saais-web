import { useRef } from "react";
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

type DepartmentDirectoryStudent = Pick<
  DeanStudentSummary,
  "name" | "studentNumber" | "curriculum" | "adviser"
> & {
  id: string;
  email: string;
  yearStanding: string;
};

type DepartmentDirectoryProps<Student extends DepartmentDirectoryStudent> = {
  variant: "department-head";
  students: Student[];
  totalCount: number;
  onSelectStudent: (
    student: Student,
    trigger: HTMLButtonElement | null,
  ) => void;
};

type DeanDirectoryProps = {
  variant?: "dean";
  students: DeanStudentSummary[];
  totalCount?: number;
  onSelectStudent: (student: DeanStudentSummary) => void;
  onResetFilters?: () => void;
};

const DEPARTMENT_COLUMNS = [
  "Student",
  "School email",
  "Curriculum",
  "Year standing",
  "Adviser",
];

function DepartmentDirectoryRow<Student extends DepartmentDirectoryStudent>({
  student,
  onSelectStudent,
}: {
  student: Student;
  onSelectStudent: DepartmentDirectoryProps<Student>["onSelectStudent"];
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onSelectStudent(student, trigger.current)}
    >
      <TableCell label="Student" className="px-5 py-3 whitespace-normal">
        <Button
          ref={trigger}
          type="button"
          variant="ghost"
          className="h-auto min-w-0 flex-col items-start gap-0.5 rounded-sm p-0 text-left font-normal whitespace-normal hover:bg-transparent hover:text-primary"
          aria-label={`View ${student.name} checklist`}
        >
          <span className="block font-semibold">{student.name}</span>
          <span className="block font-mono text-xs font-normal text-muted-foreground">
            {student.studentNumber}
          </span>
        </Button>
      </TableCell>
      <TableCell
        label="School email"
        className="px-5 py-3 text-[13.5px] whitespace-normal"
      >
        <span className="min-w-0 break-all">{student.email}</span>
      </TableCell>
      <TableCell label="Curriculum" className="px-5 py-3">
        <Badge variant="secondary" className="rounded-sm">
          {student.curriculum}
        </Badge>
      </TableCell>
      <TableCell label="Year standing" className="px-5 py-3 text-[13.5px]">
        {student.yearStanding}
      </TableCell>
      <TableCell
        label="Adviser"
        className="px-5 py-3 text-[13.5px] whitespace-normal"
      >
        {student.adviser}
      </TableCell>
    </TableRow>
  );
}

function DepartmentDirectoryTable<Student extends DepartmentDirectoryStudent>({
  students,
  totalCount,
  onSelectStudent,
}: DepartmentDirectoryProps<Student>) {
  return (
    <>
      <Table responsive aria-label="Department students">
        <TableHeader className="bg-secondary">
          <TableRow>
            {DEPARTMENT_COLUMNS.map((label) => (
              <TableHead
                key={label}
                className="px-5 text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase"
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <DepartmentDirectoryRow
              key={student.id}
              student={student}
              onSelectStudent={onSelectStudent}
            />
          ))}
        </TableBody>
      </Table>
      {students.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="font-semibold">No students match these filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Change your search or reset the filters.
          </p>
        </div>
      )}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="border-t border-border px-5 py-3 text-xs text-muted-foreground"
      >
        Showing {students.length} of {totalCount} students
      </p>
    </>
  );
}

function DeanDirectoryTable({
  students,
  totalCount = students.length,
  onSelectStudent,
  onResetFilters,
}: DeanDirectoryProps) {
  const countLabel =
    students.length === totalCount
      ? `${students.length} ${students.length === 1 ? "student" : "students"}`
      : `Showing ${students.length} of ${totalCount} students`;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <h2 className="font-semibold">Student directory</h2>
          <p className="text-sm text-muted-foreground">{countLabel}</p>
        </div>
        <span
          aria-live="polite"
          className="font-mono text-xs text-muted-foreground"
        >
          {students.length} {students.length === 1 ? "student" : "students"}
        </span>
      </div>
      <Table responsive aria-label="Student directory">
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Student no.</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Curriculum</TableHead>
            <TableHead>Adviser</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length ? (
            students.map((student) => (
              <TableRow
                key={student.studentNumber}
                tabIndex={0}
                role="button"
                aria-label={`Open record for ${student.name}`}
                className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSelectStudent(student)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectStudent(student);
                  }
                }}
              >
                <TableCell label="Student" className="font-medium text-primary">
                  <span
                    className="block max-w-56 truncate"
                    title={student.name}
                  >
                    {student.name}
                  </span>
                </TableCell>
                <TableCell label="Student no." className="font-mono text-xs">
                  {student.studentNumber}
                </TableCell>
                <TableCell label="Department">
                  <span
                    className="block max-w-56 truncate"
                    title={student.department}
                  >
                    {student.department}
                  </span>
                </TableCell>
                <TableCell label="Curriculum">
                  <span
                    className="block max-w-48 truncate"
                    title={student.curriculum}
                  >
                    {student.curriculum}
                  </span>
                </TableCell>
                <TableCell label="Adviser">
                  <span
                    className="block max-w-56 truncate"
                    title={student.adviser}
                  >
                    {student.adviser}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-10 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-3">
                  <span>No students match these filters.</span>
                  {onResetFilters && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onResetFilters}
                    >
                      Reset filters
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function StudentDirectoryTable<
  Student extends DepartmentDirectoryStudent,
>(props: DepartmentDirectoryProps<Student> | DeanDirectoryProps) {
  return props.variant === "department-head" ? (
    <DepartmentDirectoryTable {...props} />
  ) : (
    <DeanDirectoryTable {...props} />
  );
}
