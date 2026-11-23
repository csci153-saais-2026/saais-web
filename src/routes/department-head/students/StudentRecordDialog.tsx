import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";
import {
  ChecklistTermGroup,
  type ChecklistRow,
} from "@/components/features/checklist-term-group";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ApiSchema } from "@/lib/api";
import {
  getChecklist,
  getGrades,
} from "@/routes/adviser/advisees/checklist/record.api";
import { useStudentAuditEvents } from "../shared/dh-queries";
import { QueryMessage } from "../shared/dh-ui";
import type { DirectoryStudent } from "../shared/students-types";
import { CourseInfoDialog, type CourseInfo } from "./CourseInfoDialog";

const STATUS: Record<ApiSchema<"AttemptStatus">, Status> = {
  na: "na",
  failed: "failed",
  passed: "passed",
  inc: "inc",
  dr: "dr",
  currently_enrolled: "enrolled",
};
const CHECKLIST_STATUS: Record<
  ApiSchema<"ChecklistSlotResult">["status"],
  Status
> = { ...STATUS, not_taken: "not-taken" };

const CATEGORY: Record<NonNullable<ApiSchema<"Course">["category"]>, string> = {
  major: "Major",
  ge: "GE",
  elective: "Elective",
  pe: "PE",
  nstp: "NSTP",
  foundation: "Foundation",
  service: "Service",
};
function ordinal(n: number) {
  const suffix = new Intl.PluralRules("en", { type: "ordinal" }).select(n);
  return `${n}${suffix === "one" ? "st" : suffix === "two" ? "nd" : suffix === "few" ? "rd" : "th"}`;
}

type Checklist = Awaited<ReturnType<typeof getChecklist>>;
type TermGroup = {
  title: string;
  rows: (ChecklistRow & { info: CourseInfo })[];
};

function toTerms(data: Checklist): TermGroup[] {
  const groups = new Map<string, TermGroup["rows"]>();
  for (const result of data.results) {
    const slot = data.slots.find(
      (item) => item.id === result.curriculum_term_course_id,
    );
    const term = data.terms.find(
      (item) => item.id === slot?.curriculum_term_id,
    );
    const course = data.courses.find((item) => item.id === slot?.course_id);
    const title = term
      ? `Year ${term.year_level} · Semester ${term.term_sequence}`
      : "Other requirements";
    const attempts = result.attempts ?? [];
    const row = {
      code: course?.code ?? slot?.slot_label ?? "Requirement",
      title: course?.title ?? "Elective requirement",
      status: CHECKLIST_STATUS[result.status],
      unitsRequired: result.required_units,
      unitsEarned: result.earned_units,
      source:
        result.satisfaction_source ??
        (attempts.length ? "Direct attempt" : "Not yet satisfied"),
      attempts: attempts.length,
    };
    const meta = [
      `${result.required_units} ${result.required_units === 1 ? "unit" : "units"}`,
      course?.category ? CATEGORY[course.category] : null,
      term
        ? `${ordinal(term.year_level)} Year, ${ordinal(term.term_sequence)} Semester`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    groups.set(title, [
      ...(groups.get(title) ?? []),
      {
        ...row,
        info: {
          title: course
            ? `${course.code} · ${course.title}`
            : (slot?.slot_label ?? "Requirement"),
          meta,
          status: row.status,
          attempts,
          gradeFixes: result.grade_fix_history ?? [],
        },
      },
    ]);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([title, rows]) => ({ title, rows }));
}

const grade = (value: number | null) =>
  value == null ? "—" : value.toFixed(2);
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
const HEAD =
  "px-3.5 text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase";
const CELL = "px-3.5 py-2.5 text-[13.5px]";

function ChecklistTab({ student }: { student: DirectoryStudent }) {
  const [selected, setSelected] = useState<CourseInfo | null>(null);
  const checklist = useQuery({
    queryKey: [
      ...useDepartmentHeadQueryKey(["department-head", "checklist"]),
      student.id,
    ],
    queryFn: () => getChecklist(student.id),
  });
  if (!checklist.data)
    return <QueryMessage query={checklist} label="the checklist" />;
  const terms = toTerms(checklist.data);
  const find = (code: string) =>
    terms.flatMap((term) => term.rows).find((row) => row.code === code)?.info ??
    null;
  return (
    <div className="min-w-0 **:data-[slot=collapsible-trigger]:flex-wrap [&_[data-slot=collapsible-trigger]>span:first-child]:basis-full sm:**:data-[slot=collapsible-trigger]:flex-nowrap sm:[&_[data-slot=collapsible-trigger]>span:first-child]:basis-auto">
      {terms.map((term) => (
        <ChecklistTermGroup
          key={term.title}
          title={term.title}
          rows={term.rows}
          passedUnits={term.rows.reduce(
            (total, row) => total + row.unitsEarned,
            0,
          )}
          totalUnits={term.rows.reduce(
            (total, row) => total + row.unitsRequired,
            0,
          )}
          onCourseInfo={(code) => setSelected(find(code))}
        />
      ))}
      {terms.length === 0 && (
        <p>No checklist is available for this curriculum.</p>
      )}
      {selected && (
        <CourseInfoDialog course={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function GradesTab({ student }: { student: DirectoryStudent }) {
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

function AuditTab({ student }: { student: DirectoryStudent }) {
  const audit = useStudentAuditEvents(student.id);
  if (!audit.data) return <QueryMessage query={audit} label="the audit log" />;
  if (audit.data.length === 0)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No audit events have been recorded for this student.
      </p>
    );
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table responsive aria-label="Student audit log">
        <TableHeader className="bg-secondary">
          <TableRow>
            {["Timestamp", "Person", "Action", "Details"].map((label) => (
              <TableHead key={label} className={HEAD}>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {audit.data.map((event) => (
            <TableRow key={event.id}>
              <TableCell label="Timestamp" className={CELL}>
                <time dateTime={event.timestamp}>
                  {dateFormatter.format(new Date(event.timestamp))}
                </time>
              </TableCell>
              <TableCell label="Person" className={`${CELL} whitespace-normal`}>
                {event.person}
              </TableCell>
              <TableCell label="Action" className={CELL}>
                {event.action}
              </TableCell>
              <TableCell
                label="Details"
                className={`${CELL} whitespace-normal`}
              >
                <span className="min-w-0">
                  {event.record} · {event.details}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Read-only student record: checklist, grades and audit log, each loaded from its own endpoint when opened. */
export function StudentRecordDialog({
  student,
  onClose,
}: {
  student: DirectoryStudent;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{student.name} · Student record</DialogTitle>
          <DialogDescription>
            {student.studentNumber} · {student.curriculum} ·{" "}
            {student.yearStanding}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="checklist" className="min-w-0 gap-4">
          <TabsList variant="line" aria-label="Student record sections">
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>
          <TabsContent value="checklist">
            <ChecklistTab student={student} />
          </TabsContent>
          <TabsContent value="grades">
            <GradesTab student={student} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditTab student={student} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
