import "../shared/staff-filters.css";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { FormField } from "@/components/features/form-field";
import { SearchInput } from "@/components/features/search-input";
import { AlertIcon, SwapIcon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAdviserReassignment } from "./use-adviser-reassignment";
import { useStaffScope } from "../shared/use-staff-scope";
import { staffQueryKeys } from "../shared/staff-query-keys";
import { listStudentRoster } from "../students/students.api";
import {
  listDepartmentAssignmentAdvisers,
  listStudentAdviserAssignments,
} from "./adviser-assignments.api";
import { ReassignAdviserDialog } from "./ReassignAdviserDialog";

const TH =
  "h-auto bg-secondary px-3.5 py-2.5 text-[11.5px] font-semibold tracking-[0.09em] text-muted-2 uppercase";
const TD = "px-3.5 py-[11px] text-[13.5px] leading-normal";
const todayInManila = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const dateLabel = (date?: string | null) =>
  date
    ? new Intl.DateTimeFormat("en-PH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T00:00:00Z`))
    : "—";

type Filters = { search: string; curriculum: string; adviser: string };
const emptyFilters: Filters = { search: "", curriculum: "all", adviser: "all" };

export default function AdviserAssignmentsPage() {
  const scope = useStaffScope();
  const active = scope.status === "ready" ? scope : null;
  const [today, setToday] = useState(todayInManila);
  useEffect(() => {
    let timer: number;
    const refresh = () => {
      setToday(todayInManila());
      window.clearTimeout(timer);
      const now = new Date();
      const nextMidnight =
        new Date(todayInManila() + "T00:00:00+08:00").getTime() + 86400000;
      timer = window.setTimeout(
        refresh,
        Math.max(1, nextMidnight - now.getTime()),
      );
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const department = useStaffDepartmentName();
  const reassign = useAdviserReassignment();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const directory = useQuery({
    queryKey: staffQueryKeys.resource(
      active?.profileId ?? "",
      active?.departmentId ?? "",
      "adviser-assignments",
      { view: "directory" },
    ),
    enabled: !!active,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!active) throw new Error("An authorized department is required.");
      const students: Awaited<ReturnType<typeof listStudentRoster>>["items"] =
        [];
      while (true) {
        const page = await listStudentRoster(
          {
            department_id: active.departmentId,
            limit: 100,
            offset: students.length,
          },
          signal,
        );
        students.push(...page.items);
        if (students.length >= page.total_count) break;
        if (!page.items.length)
          throw new Error(
            "The student directory returned an incomplete result.",
          );
      }
      const history = [];
      for (let start = 0; start < students.length; start += 50) {
        history.push(
          ...(await listStudentAdviserAssignments(
            students
              .slice(start, start + 50)
              .map((student) => student.student_id),
            signal,
          )),
        );
      }
      return { students, history };
    },
  });
  const advisers = useQuery({
    queryKey: staffQueryKeys.resource(
      active?.profileId ?? "",
      active?.departmentId ?? "",
      "assignment-advisers",
    ),
    enabled: !!active,
    retry: false,
    queryFn: ({ signal }) => {
      if (!active) throw new Error("An authorized department is required.");
      return listDepartmentAssignmentAdvisers(active.departmentId, signal);
    },
  });
  const directoryData = directory.data;
  const students = useMemo(() => {
    const historyByStudent = new Map<
      string,
      Awaited<ReturnType<typeof listStudentAdviserAssignments>>
    >();
    for (const assignment of directoryData?.history ?? []) {
      const assignments = historyByStudent.get(assignment.student_id) ?? [];
      assignments.push(assignment);
      historyByStudent.set(assignment.student_id, assignments);
    }
    return (directoryData?.students ?? []).map((student) => {
      const assignments = (historyByStudent.get(student.student_id) ?? []).sort(
        (a, b) => a.start_date.localeCompare(b.start_date),
      );
      const current = assignments
        .filter(
          (entry) =>
            entry.start_date <= today &&
            (!entry.end_date || entry.end_date > today),
        )
        .at(-1);
      const previous = assignments
        .filter((entry) => entry.end_date && entry.end_date <= today)
        .at(-1);
      const scheduled = assignments.find((entry) => entry.start_date > today);
      return {
        student,
        current,
        previous,
        scheduled,
        adviser: current?.adviser_name ?? "Unassigned",
      };
    });
  }, [directoryData, today]);
  const matches = (item: (typeof students)[number], value: Filters) => {
    const query = value.search.trim().toLowerCase();
    return (
      (item.student.full_name.toLowerCase().includes(query) ||
        item.student.student_number.toLowerCase().includes(query)) &&
      (value.curriculum === "all" ||
        item.student.curriculum_label === value.curriculum) &&
      (value.adviser === "all" ||
        (item.current?.adviser_id ?? "unassigned") === value.adviser)
    );
  };
  const visible = students.filter((item) => matches(item, filters));
  const visibleIds = new Set(visible.map((item) => item.student.student_id));
  const selectedVisible = selected.filter((id) => visibleIds.has(id));
  const selectedItems = students.filter((item) =>
    selectedVisible.includes(item.student.student_id),
  );
  const allSelected =
    visible.length > 0 && selectedVisible.length === visible.length;
  const currentAdvisers = new Set(
    selectedItems.map((item) => item.current?.adviser_id),
  );
  const assignableAdvisers = (advisers.data ?? []).filter(
    (adviser) =>
      !(currentAdvisers.size === 1 && currentAdvisers.has(adviser.id)),
  );
  const curricula = [
    ...new Set(students.map((item) => item.student.curriculum_label)),
  ].sort();
  const adviserOptions = new Map(
    (advisers.data ?? []).map((item) => [item.id, item.label]),
  );
  for (const item of students)
    if (item.current) adviserOptions.set(item.current.adviser_id, item.adviser);
  const adviserNames = [...adviserOptions]
    .map(([id, label]) => ({
      id,
      label:
        [...adviserOptions.values()].filter((value) => value === label).length >
        1
          ? label + " (" + id + ")"
          : label,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  function changeFilters(next: Filters) {
    setFilters(next);
    const remaining = new Set(
      students
        .filter((item) => matches(item, next))
        .map((item) => item.student.student_id),
    );
    setSelected((current) => current.filter((id) => remaining.has(id)));
  }
  function toggleStudent(id: string, checked: boolean) {
    setSelected((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((value) => value !== id),
    );
  }
  async function apply(input: {
    adviserId: string;
    effectiveDate: string;
    reason: string;
  }) {
    if (directory.isError || directory.isFetching)
      throw new Error("Refresh assignments before reassigning students.");
    if (selectedVisible.length > 500)
      throw new Error("Select at most 500 students.");
    if (!selectedVisible.length)
      throw new Error("Select at least one student to reassign.");
    if (!assignableAdvisers.some((adviser) => adviser.id === input.adviserId))
      throw new Error("Choose a different eligible adviser.");
    if (selectedItems.some((item) => item.scheduled))
      throw new Error(
        "A selected student already has a scheduled reassignment. Review it before making another change.",
      );
    if (selectedItems.some((item) => !item.current))
      throw new Error("A selected student has no current adviser assignment.");
    if (
      selectedItems.some(
        (item) => item.current && input.effectiveDate < item.current.start_date,
      )
    )
      throw new Error(
        "The effective date cannot precede a selected student's current assignment.",
      );
    await reassign.mutateAsync({
      student_ids: selectedVisible,
      adviser_id: input.adviserId,
      effective_since: input.effectiveDate,
      reason: input.reason,
    });
    setSelected([]);
    setNotice(
      `${input.effectiveDate > todayInManila() ? "Scheduled reassignment for" : "Reassigned"} ${selectedVisible.length} student${selectedVisible.length === 1 ? "" : "s"}.`,
    );
  }
  const heading = (
    <PageHeading
      className={
        active && active.departmentIds.length <= 1 ? "-mt-6" : undefined
      }
      title="Adviser assignments"
      subtitle="Keep every student connected to an adviser in your department."
    />
  );
  if (!directory.data)
    return (
      <>
        {heading}
        {directory.isError ? (
          <div role="alert" className="rounded-md border p-5">
            <p>We couldn’t load adviser assignments.</p>
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
            Loading adviser assignments…
          </p>
        )}
      </>
    );
  return (
    <>
      {heading}
      <Alert variant="advisory">
        <AlertIcon />
        <AlertDescription>
          Reassignment takes effect on the selected date. The previous adviser
          and assignment history remain visible.
        </AlertDescription>
      </Alert>
      {directory.isError && (
        <div role="alert">
          Cached assignments are stale.{" "}
          <Button variant="link" onClick={() => void directory.refetch()}>
            Retry assignments
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      <Panel
        title="Student–adviser assignments"
        description="Select one or more students to reassign together."
        flush
      >
        <div className="staff-filter-controls grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_200px_240px_auto] xl:items-end">
          <FormField label="Search students" htmlFor="staff-assignment-search">
            <SearchInput
              id="staff-assignment-search"
              placeholder="Search by student name or ID"
              value={filters.search}
              onChange={(event) =>
                changeFilters({ ...filters, search: event.target.value })
              }
            />
          </FormField>
          <FormField label="Curriculum" htmlFor="staff-assignment-curriculum">
            <Select
              value={filters.curriculum}
              onValueChange={(curriculum) =>
                changeFilters({ ...filters, curriculum })
              }
            >
              <SelectTrigger
                id="staff-assignment-curriculum"
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
          <FormField label="Adviser" htmlFor="staff-assignment-adviser">
            <Select
              value={filters.adviser}
              onValueChange={(adviser) =>
                changeFilters({ ...filters, adviser })
              }
            >
              <SelectTrigger id="staff-assignment-adviser" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All advisers</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {adviserNames.map((value) => (
                  <SelectItem key={value.id} value={value.id}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <Button
            variant="outline"
            disabled={
              !filters.search &&
              filters.curriculum === "all" &&
              filters.adviser === "all"
            }
            onClick={() => changeFilters(emptyFilters)}
          >
            Reset filters
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4 border-b border-border px-5 py-4">
          <span aria-live="polite" className="text-sm text-muted-foreground">
            {selectedVisible.length} student
            {selectedVisible.length === 1 ? "" : "s"} selected (maximum 500)
          </span>
          <Button
            type="button"
            disabled={
              !selectedVisible.length ||
              selectedVisible.length > 500 ||
              directory.isError ||
              directory.isFetching
            }
            onClick={() => setDialogOpen(true)}
          >
            <SwapIcon aria-hidden="true" />
            Reassign selected
          </Button>
        </div>
        <Table responsive aria-label="Student adviser assignments">
          <TableHeader>
            <TableRow>
              <TableHead className={`${TH} w-20`}>
                <Checkbox
                  className="data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:before:absolute data-[state=indeterminate]:before:h-px data-[state=indeterminate]:before:w-2 data-[state=indeterminate]:before:bg-primary-foreground data-[state=indeterminate]:[&_svg]:hidden"
                  aria-label="Select all visible students"
                  disabled={!visible.length}
                  checked={
                    selectedVisible.length && !allSelected
                      ? "indeterminate"
                      : allSelected
                  }
                  onCheckedChange={(checked) =>
                    setSelected(
                      checked === true
                        ? visible.map((item) => item.student.student_id)
                        : [],
                    )
                  }
                />
              </TableHead>
              {["Student", "Current adviser", "Since", "Previous adviser"].map(
                (label) => (
                  <TableHead key={label} className={TH}>
                    {label}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((item) => (
              <TableRow
                key={item.student.student_id}
                className="cursor-pointer border-line-soft hover:bg-line-soft"
                onClick={() =>
                  toggleStudent(
                    item.student.student_id,
                    !selected.includes(item.student.student_id),
                  )
                }
                data-state={
                  selected.includes(item.student.student_id)
                    ? "selected"
                    : undefined
                }
              >
                <TableCell
                  label="Select"
                  className={`${TD} w-20`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    aria-label={`Select ${item.student.full_name}`}
                    checked={selected.includes(item.student.student_id)}
                    onCheckedChange={(checked) =>
                      toggleStudent(item.student.student_id, checked === true)
                    }
                  />
                </TableCell>
                <TableCell
                  label="Student"
                  className={`${TD} whitespace-normal`}
                >
                  <span
                    className="block max-w-64 truncate font-semibold"
                    title={item.student.full_name}
                  >
                    {item.student.full_name}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {item.student.student_number}
                  </span>
                  <Badge variant="secondary" className="mt-1 rounded-sm">
                    {item.student.curriculum_label}
                  </Badge>
                </TableCell>
                <TableCell
                  label="Current adviser"
                  className={`${TD} whitespace-normal`}
                >
                  {item.adviser}
                  {item.scheduled && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scheduled: {item.scheduled.adviser_name} from{" "}
                      {dateLabel(item.scheduled.start_date)}
                    </p>
                  )}
                </TableCell>
                <TableCell label="Since" className={TD}>
                  {dateLabel(item.current?.start_date)}
                </TableCell>
                <TableCell
                  label="Previous adviser"
                  className={`${TD} whitespace-normal`}
                >
                  {item.previous?.adviser_name ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!visible.length && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No students match these filters.
          </p>
        )}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span role="status">
            Showing {visible.length} of {students.length} assignments
          </span>
          <span>{department.data ?? "Department"} scope</span>
        </div>
      </Panel>
      {dialogOpen && (
        <ReassignAdviserDialog
          studentCount={selectedVisible.length}
          advisers={assignableAdvisers}
          advisersLoading={advisers.isPending}
          advisersError={advisers.isError}
          onRetry={() => void advisers.refetch()}
          onClose={() => setDialogOpen(false)}
          onConfirm={apply}
        />
      )}
    </>
  );
}
