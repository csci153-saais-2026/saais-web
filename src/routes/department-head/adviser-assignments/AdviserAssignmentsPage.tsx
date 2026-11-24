import { AdviserAssignmentsTable } from "@/components/features/adviser-assignments-table";
import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useState } from "react";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { AlertIcon, SwapIcon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ReassignAdviserDialog } from "./ReassignAdviserDialog";
import { StudentDirectoryFilters } from "../shared/StudentDirectoryFilters";
import {
  assignmentDateLabel,
  validateReassignment,
  type ReassignmentInput,
} from "./assignment-model";
import {
  useDepartmentAdvisers,
  useDirectoryStudents,
  useReassignStudents,
} from "../shared/dh-queries";
import { todayInManila } from "../shared/dh-utils";
import { QueryMessage } from "../shared/dh-ui";
import { useNotify } from "../shared/notify-context";
import type { DirectoryStudent } from "../shared/students-types";

type Filters = { search: string; curriculum: string; adviser: string };

function matches(student: DirectoryStudent, filters: Filters) {
  const query = filters.search.trim().toLowerCase();
  return (
    (student.name.toLowerCase().includes(query) ||
      student.studentNumber.toLowerCase().includes(query)) &&
    (filters.curriculum === "all" ||
      student.curriculum === filters.curriculum) &&
    (filters.adviser === "all" || student.adviser === filters.adviser)
  );
}

export default function AdviserAssignmentsPage() {
  const directory = useDirectoryStudents();
  const adviserQuery = useDepartmentAdvisers();
  const reassign = useReassignStudents();
  const notify = useNotify();
  const students = directory.data ?? [];
  const [filters, setFilters] = useState<Filters>({
    search: "",
    curriculum: "all",
    adviser: "all",
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const visible = students.filter((student) => matches(student, filters));
  const visibleIds = new Set(visible.map((student) => student.id));
  const selectedVisible = selected.filter((id) => visibleIds.has(id));
  const allSelected =
    visible.length > 0 && selectedVisible.length === visible.length;
  const partiallySelected = selectedVisible.length > 0 && !allSelected;
  const advisers = adviserQuery.data ?? [];
  // Hide the adviser every selected student already has; they cannot be a "new" adviser.
  const currentAdvisers = new Set(
    students
      .filter((student) => selectedVisible.includes(student.id))
      .map((student) => student.adviser),
  );
  const sharedAdviser =
    currentAdvisers.size === 1 ? [...currentAdvisers][0] : null;
  const assignableAdvisers = advisers.filter(
    (adviser) => adviser.name !== sharedAdviser,
  );

  function changeFilters(next: Filters) {
    setFilters(next);
    // Match the mockup: filtering removes selections that are no longer visible.
    const stillVisible = new Set(
      students
        .filter((student) => matches(student, next))
        .map((student) => student.id),
    );
    setSelected((current) => current.filter((id) => stillVisible.has(id)));
  }

  function toggleStudent(id: string, checked: boolean) {
    setSelected((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((value) => value !== id),
    );
  }

  function openReassignment() {
    if (selectedVisible.length === 0) {
      notify("Select at least one student to reassign.");
      return;
    }
    setDialogOpen(true);
  }

  async function apply(input: ReassignmentInput) {
    const adviser = advisers.find(
      (candidate) => candidate.id === input.adviserId,
    );
    const changed = validateReassignment(students, input, adviser?.name ?? "");
    await reassign.mutateAsync(input);
    setSelected([]);
    notify(
      `${input.effectiveDate > todayInManila() ? "Scheduled reassignment for" : "Reassigned"} ${changed} student${changed === 1 ? "" : "s"}.`,
    );
  }

  const heading = (
    <PageHeading
      title="Adviser assignments"
      subtitle="Keep every student connected to an adviser in your department."
    />
  );
  if (directory.isError && !directory.data)
    return (
      <>
        {heading}
        <QueryMessage query={directory} label="adviser assignments" />
      </>
    );

  return (
    <AccountSkeleton
      id="dh-adviser-assignments"
      data={directory.data}
      label="Loading adviser assignments…"
    >
      {() => (
        <>
          {heading}
          <Alert variant="advisory">
            <AlertIcon />
            <AlertDescription>
              Reassignment takes effect on the selected date. The previous
              adviser and assignment history remain visible.
            </AlertDescription>
          </Alert>
          <Panel
            title="Student–adviser assignments"
            description="Select one or more students to reassign together."
            flush
          >
            <StudentDirectoryFilters
              students={students}
              {...filters}
              onSearchChange={(search) => changeFilters({ ...filters, search })}
              onCurriculumChange={(curriculum) =>
                changeFilters({ ...filters, curriculum })
              }
              onAdviserChange={(adviser) =>
                changeFilters({ ...filters, adviser })
              }
              onReset={() =>
                changeFilters({ search: "", curriculum: "all", adviser: "all" })
              }
            />
            <div className="flex flex-wrap items-center justify-end gap-4 border-b border-border px-5 py-4">
              <span
                aria-live="polite"
                className="text-sm text-muted-foreground"
              >
                {selectedVisible.length} student
                {selectedVisible.length === 1 ? "" : "s"} selected
              </span>
              <Button
                type="button"
                disabled={selectedVisible.length === 0}
                onClick={openReassignment}
              >
                <SwapIcon aria-hidden="true" />
                Reassign selected
              </Button>
            </div>
            <AdviserAssignmentsTable
              variant="department-head"
              assignments={visible.map((student) => ({
                id: student.id,
                name: student.name,
                studentNumber: student.studentNumber,
                curriculum: student.curriculum,
                adviser: student.adviser,
                adviserSince: assignmentDateLabel(student.adviserSince),
                previousAdviser: student.previousAdviser,
                scheduledAssignment: student.scheduledAssignment && {
                  ...student.scheduledAssignment,
                  effectiveDate: assignmentDateLabel(
                    student.scheduledAssignment.effectiveDate,
                  ),
                },
                selected: selected.includes(student.id),
              }))}
              selectAll={partiallySelected ? "indeterminate" : allSelected}
              onSelectAll={(checked) =>
                setSelected(checked ? visible.map((student) => student.id) : [])
              }
              onSelectAssignment={toggleStudent}
            />
            {visible.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No students match these filters.
              </p>
            )}
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <span role="status">
                Showing {visible.length} of {students.length} assignments
              </span>
              <span>DCST department scope</span>
            </div>
          </Panel>
          {dialogOpen && (
            <ReassignAdviserDialog
              studentIds={selectedVisible}
              advisers={assignableAdvisers}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onConfirm={apply}
            />
          )}
        </>
      )}
    </AccountSkeleton>
  );
}
