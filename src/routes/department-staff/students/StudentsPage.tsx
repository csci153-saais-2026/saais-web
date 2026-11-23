import "../shared/staff-filters.css";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { FormField } from "@/components/features/form-field";
import { SearchInput } from "@/components/features/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStaffDepartmentName } from "@/hooks/use-staff-department-name";
import { useAcademicTerms } from "@/hooks/use-academic-terms";
import { useStaffScope } from "../shared/use-staff-scope";
import { staffQueryKeys } from "../shared/staff-query-keys";
import { listDepartmentPrograms, listStudentRoster } from "./students.api";
import { StudentImportDialog } from "./import/StudentImportDialog";
import { listDepartmentAssignmentAdvisers } from "../adviser-assignments/adviser-assignments.api";

const PAGE_SIZE = 100;

export default function StudentsPage() {
  const scope = useStaffScope();
  const department = useStaffDepartmentName();
  const active = scope.status === "ready" ? scope : null;
  const academicTerms = useAcademicTerms();
  const departmentAdvisers = useQuery({
    queryKey: staffQueryKeys.resource(
      active?.profileId ?? "",
      active?.departmentId ?? "",
      "directory-advisers",
    ),
    enabled: !!active,
    retry: false,
    queryFn: ({ signal }) => {
      if (!active) throw new Error("An authorized department is required.");
      return listDepartmentAssignmentAdvisers(active.departmentId, signal);
    },
  });
  const programs = useQuery({
    queryKey: staffQueryKeys.resource(
      active?.profileId ?? "",
      active?.departmentId ?? "",
      "directory-programs",
    ),
    enabled: !!active,
    retry: false,
    queryFn: ({ signal }) => {
      if (!active) throw new Error("An authorized department is required.");
      return listDepartmentPrograms(active.departmentId, signal);
    },
  });
  const [search, setSearch] = useState("");
  const [curriculum, setCurriculum] = useState("all");
  const [adviser, setAdviser] = useState("all");
  const directory = useQuery({
    queryKey: staffQueryKeys.resource(
      active?.profileId ?? "",
      active?.departmentId ?? "",
      "students",
    ),
    enabled: !!active,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!active) throw new Error("An authorized department is required.");
      const items: Awaited<ReturnType<typeof listStudentRoster>>["items"] = [];
      while (true) {
        const page = await listStudentRoster(
          {
            department_id: active.departmentId,
            limit: PAGE_SIZE,
            offset: items.length,
          },
          signal,
        );
        items.push(...page.items);
        if (items.length >= page.total_count) return items;
        if (!page.items.length)
          throw new Error(
            "The student directory returned an incomplete result.",
          );
      }
    },
  });
  const students = directory.data ?? [];
  const query = search.trim().toLowerCase();
  const filtered = students.filter(
    (student) =>
      (student.full_name.toLowerCase().includes(query) ||
        student.student_number.toLowerCase().includes(query)) &&
      (curriculum === "all" || student.curriculum_label === curriculum) &&
      (adviser === "all" || (student.adviser_name ?? "Unassigned") === adviser),
  );
  const curricula = [
    ...new Set(students.map((s) => s.curriculum_label)),
  ].sort();
  const advisers = [
    ...new Set([
      ...(departmentAdvisers.data ?? []).map((item) => item.label),
      ...students.map((s) => s.adviser_name ?? "Unassigned"),
    ]),
  ].sort();
  const codes = [
    ...new Set((programs.data ?? []).map((program) => program.code)),
  ].sort();
  const programLabel =
    codes.length > 1
      ? `${codes.slice(0, -1).join(", ")} and ${codes.at(-1)}`
      : codes[0];
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  const currentTerm = academicTerms.data?.terms.find(
    (term) =>
      term.starts_on && term.starts_on <= today && term.ends_on >= today,
  );
  const description = [
    `${students.length} enrolled ${students.length === 1 ? "student" : "students"}`,
    programLabel ??
      (programs.isPending
        ? "Loading programs"
        : programs.isError
          ? "Programs unavailable"
          : "No programs"),
    currentTerm
      ? `AY ${currentTerm.school_year}, ${currentTerm.term_type}`
      : academicTerms.isPending
        ? "Loading academic year and semester"
        : "Academic year and semester unavailable",
  ].join(" · ");
  const heading = (
    <PageHeading
      className={
        active && active.departmentIds.length <= 1 ? "-mt-6" : undefined
      }
      title="Students"
      subtitle={`Find and review students across ${department.data ? `the ${department.data}` : "your department"}.`}
      actions={
        <StudentImportDialog
          scope={
            active
              ? {
                  profileId: active.profileId,
                  departmentId: active.departmentId,
                }
              : null
          }
        />
      }
    />
  );
  if (!directory.data)
    return (
      <>
        {heading}
        {directory.isError ? (
          <div
            role="alert"
            className="rounded-md border border-border bg-card p-5"
          >
            <p>We couldn’t load students.</p>
            <p>
              {directory.error instanceof Error
                ? directory.error.message
                : "Please try again."}
            </p>
            <Button variant="link" onClick={() => void directory.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <p
            role="status"
            className="py-10 text-center text-sm text-muted-foreground"
          >
            Loading students…
          </p>
        )}
      </>
    );
  return (
    <>
      {heading}
      <Panel title="Department directory" description={description} flush>
        <div className="staff-filter-controls grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_200px_240px_auto] xl:items-end">
          <FormField label="Search students" htmlFor="staff-student-search">
            <SearchInput
              id="staff-student-search"
              placeholder="Search by student name or ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </FormField>
          <FormField label="Curriculum" htmlFor="staff-student-curriculum">
            <Select value={curriculum} onValueChange={setCurriculum}>
              <SelectTrigger id="staff-student-curriculum" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All curricula</SelectItem>
                {curricula.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Adviser" htmlFor="staff-student-adviser">
            <Select value={adviser} onValueChange={setAdviser}>
              <SelectTrigger id="staff-student-adviser" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All advisers</SelectItem>
                {advisers.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <Button
            variant="outline"
            disabled={!search && curriculum === "all" && adviser === "all"}
            onClick={() => {
              setSearch("");
              setCurriculum("all");
              setAdviser("all");
            }}
          >
            Reset filters
          </Button>
        </div>
        <Table
          responsive
          className="table-fixed"
          aria-label="Department students"
        >
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[25%]" />
            <col className="w-[20%]" />
            <col className="w-[13%]" />
            <col className="w-[18%]" />
          </colgroup>
          <TableHeader className="bg-secondary">
            <TableRow>
              {[
                "Student",
                "School email",
                "Curriculum",
                "Year standing",
                "Adviser",
              ].map((label) => (
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
            {filtered.map((student) => (
              <TableRow key={student.student_id}>
                <TableCell label="Student" className="px-5 py-3">
                  <div className="min-w-0">
                    <span
                      className="block truncate font-semibold"
                      title={student.full_name}
                    >
                      {student.full_name}
                    </span>
                    <span
                      className="block truncate font-mono text-xs text-muted-foreground"
                      title={student.student_number}
                    >
                      {student.student_number}
                    </span>
                  </div>
                </TableCell>
                <TableCell label="School email" className="px-5 py-3">
                  <span
                    className="block min-w-0 truncate"
                    title={student.email ?? ""}
                  >
                    {student.email}
                  </span>
                </TableCell>
                <TableCell label="Curriculum" className="px-5 py-3">
                  <Badge
                    variant="secondary"
                    className="max-w-full min-w-0 rounded-sm"
                  >
                    <span className="truncate" title={student.curriculum_label}>
                      {student.curriculum_label}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell label="Year standing" className="px-5 py-3">
                  <span className="block min-w-0 truncate">
                    {new Intl.PluralRules("en", { type: "ordinal" }).select(
                      student.year_level,
                    ) === "one"
                      ? `${student.year_level}st`
                      : new Intl.PluralRules("en", { type: "ordinal" }).select(
                            student.year_level,
                          ) === "two"
                        ? `${student.year_level}nd`
                        : new Intl.PluralRules("en", {
                              type: "ordinal",
                            }).select(student.year_level) === "few"
                          ? `${student.year_level}rd`
                          : `${student.year_level}th`}{" "}
                    year
                  </span>
                </TableCell>
                <TableCell label="Adviser" className="px-5 py-3">
                  <span
                    className="block min-w-0 truncate"
                    title={student.adviser_name ?? "Unassigned"}
                  >
                    {student.adviser_name ?? "Unassigned"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
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
          className="border-t border-border px-5 py-3 text-xs text-muted-foreground"
        >
          Showing {filtered.length} of {students.length} students
        </p>
      </Panel>
    </>
  );
}
