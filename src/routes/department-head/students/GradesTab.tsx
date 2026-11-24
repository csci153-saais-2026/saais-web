import { useQuery } from "@tanstack/react-query";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiSchema } from "@/lib/api";
import { getGrades } from "@/routes/adviser/advisees/checklist/record.api";
import { QueryMessage } from "../shared/dh-ui";
import type { DirectoryStudent } from "../shared/students-types";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";

const STATUS: Record<ApiSchema<"AttemptStatus">, Status> = {
  na: "na",
  failed: "failed",
  passed: "passed",
  inc: "inc",
  dr: "dr",
  currently_enrolled: "enrolled",
};
const grade = (value: number | null) =>
  value == null ? "—" : value.toFixed(2);
const HEAD =
  "px-3.5 text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase";
const CELL = "px-3.5 py-2.5 text-[13.5px]";

export function GradesTab({ student }: { student: DirectoryStudent }) {
  const grades = useQuery({
    queryKey: [
      ...useDepartmentHeadQueryKey(["department-head", "grades"]),
      student.id,
    ],
    queryFn: () => getGrades(student.id),
  });
  if (!grades.data) return <QueryMessage query={grades} label="the grades" />;
  const { terms, offerings, courses } = grades.data;
  if (terms.length === 0)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No grades have been recorded for this student.
      </p>
    );
  return (
    <div className="grid gap-4">
      {terms.map((term) => (
        <section
          key={term.school_term_id}
          aria-label={`${term.school_year} ${term.term_type}`}
          className="overflow-hidden rounded-md border border-border bg-card"
        >
          <header className="flex items-center justify-between gap-4 bg-secondary px-5 py-3">
            <h3 className="font-semibold">
              {term.school_year} · {term.term_type}
            </h3>
            <span className="text-sm text-muted-foreground">
              GWA{" "}
              <b className="font-mono text-primary">
                {term.gwa == null ? "—" : term.gwa.toFixed(2)}
              </b>
            </span>
          </header>
          <Table responsive>
            <TableHeader>
              <TableRow>
                {["Course", "Units", "Midterm", "Final", "Result"].map(
                  (label) => (
                    <TableHead key={label} className={HEAD}>
                      {label}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {term.attempts.map((attempt) => {
                const course = courses.find(
                  (item) =>
                    item.id ===
                    offerings.find(
                      (offering) => offering.id === attempt.course_offering_id,
                    )?.course_id,
                );
                return (
                  <TableRow key={attempt.id}>
                    <TableCell
                      label="Course"
                      className={`${CELL} whitespace-normal`}
                    >
                      <b className="block font-semibold">
                        {course?.code ?? "Course"}
                      </b>
                      <span
                        className="block max-w-64 truncate text-xs text-muted-foreground"
                        title={course?.title}
                      >
                        {course?.title}
                      </span>
                    </TableCell>
                    <TableCell label="Units" className={CELL}>
                      {attempt.units_attempted}
                    </TableCell>
                    <TableCell label="Midterm" className={`${CELL} font-mono`}>
                      {grade(attempt.midterm_grade)}
                    </TableCell>
                    <TableCell label="Final" className={`${CELL} font-mono`}>
                      {grade(attempt.completion_grade ?? attempt.final_grade)}
                    </TableCell>
                    <TableCell label="Result" className={CELL}>
                      <StatusBadge status={STATUS[attempt.effective_status]} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
