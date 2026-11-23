import { useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/features/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateCatalogCourse,
  useUpdateCatalogCourse,
  courseCreationError,
  courseUpdateError,
} from "@/hooks/use-create-catalog-course";
import type { CatalogCourse } from "./course-catalog.api";
import {
  courseSchema,
  editableCourseSchema,
  type CourseValues,
  type EditableCourseValues,
} from "./course.schema";

export function CourseDialog({
  departmentId,
  departmentLabel,
  facultyLabel,
  description,
  onCreated,
  onUpdated,
  course,
  disabled = false,
  initialCategory = "major",
  triggerLabel,
}: {
  departmentId: string;
  departmentLabel?: string;
  facultyLabel?: string;
  description?: string;
  onCreated: (course: CatalogCourse) => void;
  onUpdated?: (course: CatalogCourse) => void;
  course?: CatalogCourse;
  disabled?: boolean;
  initialCategory?: CourseValues["category"];
  triggerLabel?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateCatalogCourse();
  const updateMutation = useUpdateCatalogCourse();
  const editing = course !== undefined;
  const submitting = useRef(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditableCourseValues>({
    resolver: zodResolver(editableCourseSchema),
    defaultValues: {
      code: course?.code ?? "",
      title: course?.title ?? "",
      units: course?.units ?? 0,
      type:
        course?.category === "elective" || initialCategory === "elective"
          ? "elective"
          : "non_elective",
      category: course?.category ?? initialCategory,
      status: course?.status ?? "active",
    },
  });
  const mutation = editing ? updateMutation : createMutation;
  const pending =
    createMutation.isPending || updateMutation.isPending || isSubmitting;
  const resolvedTriggerLabel =
    triggerLabel ?? (editing ? `Edit ${course.code}` : "Create catalog course");
  const openForm = () => {
    reset({
      code: course?.code ?? "",
      title: course?.title ?? "",
      units: course?.units ?? 0,
      type:
        course?.category === "elective" || initialCategory === "elective"
          ? "elective"
          : "non_elective",
      category: course?.category ?? initialCategory,
      status: course?.status ?? "active",
    });
    createMutation.reset();
    updateMutation.reset();
    setOpen(true);
  };

  async function submit(values: EditableCourseValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      if (course) {
        const updated = await updateMutation.mutateAsync({
          course,
          values: editableCourseSchema.parse(values),
        });
        onUpdated?.(updated);
      } else {
        const created = await createMutation.mutateAsync(
          courseSchema.parse(values),
        );
        onCreated(created);
      }
      setOpen(false);
    } catch {
      // Keep the entered values available for correction; do not retry a mutation automatically.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={editing ? `Edit ${course.code}` : undefined}
        disabled={disabled || !departmentId}
        onClick={openForm}
      >
        {resolvedTriggerLabel}
      </Button>
      {open && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next && !pending) setOpen(false);
          }}
        >
          <DialogContent
            className={
              editing
                ? "flex max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-md p-0 sm:max-w-[750px]"
                : "max-h-[90dvh] overflow-y-auto"
            }
            showCloseButton={!pending}
            onEscapeKeyDown={(event) => {
              if (pending) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (pending) event.preventDefault();
            }}
          >
            <DialogHeader
              className={
                editing
                  ? "shrink-0 border-b border-border px-5 py-[18px]"
                  : undefined
              }
            >
              <DialogTitle>
                {editing ? "Edit course" : "Create catalog course"}
              </DialogTitle>
              {!editing && (
                <DialogDescription>
                  {description ??
                    "Create a department course, then attach it to this curriculum requirement."}
                </DialogDescription>
              )}
            </DialogHeader>
            <form
              noValidate
              className={
                editing
                  ? "flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
                  : "grid gap-4"
              }
              aria-busy={pending}
              onSubmit={(event) => {
                void handleSubmit(submit)(event);
              }}
            >
              <div
                className={
                  editing
                    ? "min-h-0 flex-1 overflow-y-auto px-7 py-8"
                    : undefined
                }
              >
                <fieldset
                  disabled={pending}
                  className={
                    editing
                      ? "grid min-w-0 grid-cols-2 gap-x-6 gap-y-5"
                      : "grid min-w-0 gap-4"
                  }
                >
                  {!editing && (
                    <FormField
                      label="Department"
                      htmlFor="catalog-course-department"
                      hint="Courses are created only in your authorized department."
                    >
                      <Input
                        id="catalog-course-department"
                        value={departmentLabel || departmentId}
                        readOnly
                      />
                    </FormField>
                  )}
                  <input type="hidden" {...register("category")} />
                  <FormField
                    label="Course code"
                    htmlFor="catalog-course-code"
                    error={errors.code?.message}
                  >
                    <Input
                      id="catalog-course-code"
                      autoComplete="off"
                      maxLength={250}
                      aria-invalid={!!errors.code}
                      {...register("code")}
                    />
                  </FormField>
                  <FormField
                    label="Course title"
                    htmlFor="catalog-course-title"
                    error={errors.title?.message}
                  >
                    <Input
                      id="catalog-course-title"
                      maxLength={250}
                      aria-invalid={!!errors.title}
                      {...register("title")}
                    />
                  </FormField>
                  <FormField
                    label="Units"
                    htmlFor="catalog-course-units"
                    error={errors.units?.message}
                  >
                    <Input
                      id="catalog-course-units"
                      type="number"
                      min={0.25}
                      step={0.25}
                      aria-invalid={!!errors.units}
                      {...register("units", { valueAsNumber: true })}
                    />
                  </FormField>
                  {editing && (
                    <FormField label="Faculty" htmlFor="catalog-course-faculty">
                      <Input
                        id="catalog-course-faculty"
                        value={facultyLabel || "Faculty unavailable"}
                        readOnly
                      />
                    </FormField>
                  )}
                  {editing && (
                    <FormField
                      label="Department"
                      htmlFor="catalog-course-department"
                    >
                      <Input
                        id="catalog-course-department"
                        value={departmentLabel || departmentId}
                        readOnly
                      />
                    </FormField>
                  )}
                  {editing && (
                    <FormField
                      label="Status"
                      htmlFor="catalog-course-status"
                      error={errors.status?.message}
                    >
                      <select
                        id="catalog-course-status"
                        className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm"
                        aria-invalid={!!errors.status}
                        {...register("status")}
                      >
                        <option value="active">Active</option>
                        {course?.status === "inactive" && (
                          <option value="inactive">Inactive</option>
                        )}
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </FormField>
                  )}
                  {!editing && (
                    <FormField
                      label="Status"
                      htmlFor="catalog-course-status"
                      error={errors.status?.message}
                    >
                      <select
                        id="catalog-course-status"
                        className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm"
                        aria-invalid={!!errors.status}
                        {...register("status")}
                      >
                        <option value="active">Active</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </FormField>
                  )}
                  <FormField
                    label="Course type"
                    htmlFor="catalog-course-type"
                    className={editing ? "col-span-2" : undefined}
                    error={errors.type?.message}
                  >
                    {editing ? (
                      <div className="flex flex-wrap gap-6 pt-1">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <input
                            type="radio"
                            value="non_elective"
                            aria-invalid={!!errors.type}
                            {...register("type")}
                          />
                          Non-Elective
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <input
                            type="radio"
                            value="elective"
                            aria-invalid={!!errors.type}
                            {...register("type")}
                          />
                          Elective
                        </label>
                      </div>
                    ) : (
                      <select
                        id="catalog-course-type"
                        className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm"
                        aria-invalid={!!errors.type}
                        {...register("type")}
                      >
                        <option value="non_elective">Non-elective</option>
                        <option value="elective">Elective</option>
                      </select>
                    )}
                  </FormField>
                </fieldset>
                {mutation.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {editing
                      ? courseUpdateError(updateMutation.error)
                      : courseCreationError(createMutation.error)}
                  </p>
                )}
              </div>
              <DialogFooter
                className={
                  editing
                    ? "shrink-0 flex-row border-t border-border px-5 py-4"
                    : undefined
                }
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending
                    ? editing
                      ? "Saving course..."
                      : "Creating course..."
                    : editing
                      ? "Save changes"
                      : "Create course"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
