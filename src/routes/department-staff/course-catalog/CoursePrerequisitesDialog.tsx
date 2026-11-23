import { TableSkeleton } from "@/components/features/loading-skeletons";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  coursePrerequisiteError,
  useCourseCatalogPrerequisites,
} from "@/hooks/use-course-catalog-prerequisites";
import {
  coursePrerequisiteMutationError,
  useCreateCoursePrerequisite,
  useDeleteCoursePrerequisite,
  useDepartmentPrerequisiteCandidates,
} from "@/hooks/use-course-catalog-prerequisite-actions";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import type {
  CatalogCourse,
  CatalogPrerequisiteType,
} from "./course-catalog.api";

interface CoursePrerequisitesDialogProps {
  course: CatalogCourse | null;
  open: boolean;
  onReturnFocus: () => void;
  onClose: () => void;
}

export function CoursePrerequisitesDialog({
  course,
  open,
  onReturnFocus,
  onClose,
}: CoursePrerequisitesDialogProps) {
  const prerequisites = useCourseCatalogPrerequisites(course?.id ?? "", open);
  const staffScope = useStaffScope();
  const canManage =
    staffScope.status === "ready" &&
    course !== null &&
    staffScope.departmentIds.includes(course.department_id) &&
    staffScope.departmentId === course.department_id;
  const candidates = useDepartmentPrerequisiteCandidates(
    course?.department_id ?? "",
    open && canManage,
  );
  const create = useCreateCoursePrerequisite();
  const remove = useDeleteCoursePrerequisite();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [types, setTypes] = useState<Record<string, CatalogPrerequisiteType>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const pending = saving || create.isPending || remove.isPending;

  const existingTypes = Object.fromEntries(
    (prerequisites.data ?? []).map((item) => [
      item.prerequisiteCourseId,
      item.type,
    ]),
  );
  const resolvedSelected = Object.fromEntries(
    (candidates.data ?? [])
      .filter((item) => item.id !== course?.id)
      .map((item) => [item.id, selected[item.id] ?? item.id in existingTypes]),
  );
  const resolvedTypes = { ...types, ...existingTypes };

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !course ||
      !canManage ||
      pending ||
      submitting.current ||
      !prerequisites.isSuccess ||
      !candidates.isSuccess
    )
      return;
    submitting.current = true;
    setSaving(true);
    setMessage("");
    create.reset();
    remove.reset();
    try {
      const existing = new Map(
        prerequisites.data.map((item) => [item.prerequisiteCourseId, item]),
      );
      const candidateIds = new Set(candidates.data.map((item) => item.id));
      const desired = new Set(
        Object.entries(resolvedSelected)
          .filter(([, enabled]) => enabled)
          .map(([id]) => id),
      );
      for (const item of prerequisites.data) {
        if (!candidateIds.has(item.prerequisiteCourseId)) continue;
        if (!desired.has(item.prerequisiteCourseId)) {
          await remove.mutateAsync({
            departmentId: course.department_id,
            id: item.id,
          });
        }
      }
      for (const id of desired) {
        const current = existing.get(id);
        if (!current) {
          await create.mutateAsync({
            departmentId: course.department_id,
            body: {
              course_id: course.id,
              prerequisite_course_id: id,
              type: resolvedTypes[id] ?? "strict",
            },
          });
        }
      }
      setMessage("Prerequisites saved.");
    } catch {
      setMessage(
        "Some changes could not be saved. The list will refresh with the server state.",
      );
      void prerequisites.refetch();
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const isLoading =
    prerequisites.isPending || (canManage && candidates.isPending);
  const loadError =
    prerequisites.error ?? (candidates.isError ? candidates.error : null);

  return (
    <DialogContent
      className="flex max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[750px]"
      showCloseButton={!pending}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onReturnFocus();
      }}
      onEscapeKeyDown={(event) => {
        if (pending) event.preventDefault();
      }}
      onInteractOutside={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
        <DialogTitle>Prerequisites · {course?.code || "Course"}</DialogTitle>
        <DialogDescription>
          Choose the courses a student must take first, or alongside,{" "}
          <strong>{course?.code || "this course"}</strong>. Different course
          codes never imply equivalence.
        </DialogDescription>
      </DialogHeader>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          void save(event);
        }}
      >
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {canManage && Object.keys(existingTypes).length > 0 && (
            <p className="text-xs text-muted-foreground">
              Existing relationship types cannot be changed here. Their current
              type will be preserved.
            </p>
          )}
          {!canManage &&
            prerequisites.isSuccess &&
            prerequisites.data.map((item) => (
              <div
                key={item.id}
                className="rounded-sm border border-border p-3"
              >
                <p
                  className="truncate"
                  title={`${item.course?.code ?? ""} ${item.course?.title ?? ""}`.trim()}
                >
                  {item.course?.code} {item.course?.title}
                </p>
                <p>
                  {item.type === "strict"
                    ? "Prerequisite"
                    : item.type === "co_requisite"
                      ? "Co-requisite"
                      : "Recommended"}
                </p>
              </div>
            ))}
          {isLoading && (
            <TableSkeleton
              rows={4}
              columns={4}
              label="Loading department courses and prerequisites…"
            />
          )}
          {loadError && (
            <div className="space-y-2 py-3">
              <p role="alert" className="text-sm text-destructive">
                {coursePrerequisiteError(loadError)}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void prerequisites.refetch();
                  if (candidates.isError) void candidates.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          )}
          {prerequisites.isSuccess &&
            candidates.isSuccess &&
            candidates.data.filter((item) => item.id !== course?.id).length ===
              0 && (
              <p className="py-4 text-sm text-muted-foreground">
                No other courses are available in this department.
              </p>
            )}
          {prerequisites.isSuccess &&
            candidates.isSuccess &&
            candidates.data
              .filter((item) => item.id !== course?.id)
              .map((candidate) => {
                const checked = resolvedSelected[candidate.id] ?? false;
                const id = `prerequisite-course-${candidate.id}`;
                return (
                  <div
                    key={candidate.id}
                    className="flex min-w-0 items-center gap-3 rounded-sm border border-border p-2.5 sm:px-4 sm:py-2"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={!canManage || pending}
                      onCheckedChange={(value) => {
                        setSelected((previous) => ({
                          ...previous,
                          [candidate.id]: value === true,
                        }));
                        setMessage("");
                      }}
                    />
                    <label
                      htmlFor={id}
                      className="min-w-0 flex-1 cursor-pointer truncate font-semibold text-muted-foreground"
                      title={`${candidate.code} ${candidate.title}`}
                    >
                      <span className="font-mono">{candidate.code}</span>{" "}
                      {candidate.title}
                    </label>
                    <Select
                      value={resolvedTypes[candidate.id] ?? "strict"}
                      disabled={
                        !canManage || pending || candidate.id in existingTypes
                      }
                      onValueChange={(value) => {
                        setTypes((previous) => ({
                          ...previous,
                          [candidate.id]: value as CatalogPrerequisiteType,
                        }));
                        setMessage("");
                      }}
                    >
                      <SelectTrigger
                        aria-label={`Relationship type for ${candidate.code}`}
                        className="w-[175px] shrink-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">Prerequisite</SelectItem>
                        <SelectItem value="co_requisite">
                          Co-requisite
                        </SelectItem>
                        <SelectItem value="recommended">Recommended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
          {prerequisites.isSuccess &&
            prerequisites.data.some(
              (item) =>
                !candidates.data?.some(
                  (candidate) => candidate.id === item.prerequisiteCourseId,
                ),
            ) && (
              <p className="text-xs text-muted-foreground">
                Some existing links refer to courses outside the available
                department list and will be preserved.
              </p>
            )}
          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
          {(create.isError || remove.isError) && (
            <p role="alert" className="text-sm text-destructive">
              {coursePrerequisiteMutationError(create.error ?? remove.error)}
            </p>
          )}
        </div>
        <DialogFooter className="shrink-0 flex-row border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          {canManage && (
            <Button
              type="submit"
              disabled={
                !prerequisites.isSuccess || !candidates.isSuccess || pending
              }
            >
              {pending ? "Saving prerequisites…" : "Save prerequisites"}
            </Button>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
