import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { ROSTER_SKELETON_SAMPLE } from "../shared/roster.skeleton-sample";
import "../shared/staff-filters.css";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DataTablePanel,
  type Column,
} from "@/components/features/data-table-panel";
import { PageHeading } from "@/components/features/page-heading";
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
  const students = directory.data ?? ROSTER_SKELETON_SAMPLE;
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
  const studentColumns: Column<(typeof students)[number]>[] = [
    {
      header: "Student",
      className: "px-5 py-3",
      cell: (student) => (
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
      ),
    },
    {
      header: "School email",
      className: "px-5 py-3",
      cell: (student) => (
        <span className="block min-w-0 truncate" title={student.email ?? ""}>
          {student.email}
        </span>
      ),
    },
    {
      header: "Curriculum",
      className: "px-5 py-3",
      cell: (student) => (
        <Badge variant="secondary" className="max-w-full min-w-0 rounded-sm">
          <span className="truncate" title={student.curriculum_label}>
            {student.curriculum_label}
          </span>
        </Badge>
      ),
    },
    {
      header: "Year standing",
      className: "px-5 py-3",
      cell: (student) => {
        const ordinal = new Intl.PluralRules("en", { type: "ordinal" }).select(
          student.year_level,
        );
        const suffix =
          ordinal === "one"
            ? "st"
            : ordinal === "two"
              ? "nd"
              : ordinal === "few"
                ? "rd"
                : "th";
        return (
          <span className="block min-w-0 truncate">
            {student.year_level}
            {suffix} year
          </span>
        );
      },
    },
    {
      header: "Adviser",
      className: "px-5 py-3",
      cell: (student) => (
        <span
          className="block min-w-0 truncate"
          title={student.adviser_name ?? "Unassigned"}
        >
          {student.adviser_name ?? "Unassigned"}
        </span>
      ),
    },
  ];
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
  if (!directory.data && directory.isError)
    return (
      <>
        {heading}
        {
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
        }
      </>
    );
  return (
    <AccountSkeleton
      id="staff-students"
      data={directory.data}
      sample={ROSTER_SKELETON_SAMPLE}
      label="Loading students…"
    >
      {() => (
        <>
          {heading}
          <DataTablePanel
            title="Department directory"
            description={description}
            columns={studentColumns}
            rows={filtered}
            rowKey={(student) => student.student_id}
            toolbar={
              <div className="staff-filter-controls grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_200px_240px_auto] xl:items-end">
                <FormField
                  label="Search students"
                  htmlFor="staff-student-search"
                >
                  <SearchInput
                    id="staff-student-search"
                    placeholder="Search by student name or ID"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </FormField>
                <FormField
                  label="Curriculum"
                  htmlFor="staff-student-curriculum"
                >
                  <Select value={curriculum} onValueChange={setCurriculum}>
                    <SelectTrigger
                      id="staff-student-curriculum"
                      className="w-full"
                    >
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
                    <SelectTrigger
                      id="staff-student-adviser"
                      className="w-full"
                    >
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
                  disabled={
                    !search && curriculum === "all" && adviser === "all"
                  }
                  onClick={() => {
                    setSearch("");
                    setCurriculum("all");
                    setAdviser("all");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            }
            empty="No students match these filters. Change your search or reset the filters."
            footer={
              <p role="status" aria-live="polite">
                Showing {filtered.length} of {students.length} students
              </p>
            }
          />
        </>
      )}
    </AccountSkeleton>
  );
}
