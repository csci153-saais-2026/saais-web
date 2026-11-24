import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/features/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiClientError } from "@/lib/api";
import {
  useCreateCurriculumSlot,
  useCurriculumCourses,
  useManageCurriculumSlot,
} from "@/hooks/use-curricula";
import type {
  CurriculumSlot,
  CurriculumTerm,
  CurriculumVersion,
} from "./curricula.api";
import {
  curriculumSlotSchema,
  type CurriculumSlotValues,
} from "./curriculum-slot.schema";

function slotError(error: unknown, editing: boolean): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return `You do not have permission to ${editing ? "edit" : "add"} requirements to this curriculum.`;
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again.";
    if (error.isConflict)
      return `The requirement could not be ${editing ? "updated" : "added"} because its history is protected or the curriculum changed. ${error.message}`;
    if (error.isRateLimited)
      return "Too many requests. Wait before trying again.";
    if (error.isNetworkError)
      return `The ${editing ? "update" : "creation"} result could not be confirmed. Refresh the curriculum before submitting again.`;
  }
  return error instanceof Error
    ? error.message
    : `The requirement could not be ${editing ? "updated" : "added"}.`;
}

type CurriculumSlotDialogProps = {
  term: CurriculumTerm;
  version: CurriculumVersion;
  onClose: () => void;
} & (
  | {
      slot?: undefined;
      onCreated: (versionId: string) => void;
      onUpdated?: never;
    }
  | {
      slot: CurriculumSlot;
      onUpdated: (versionId: string) => void;
      onCreated?: never;
    }
);

export function CurriculumSlotDialog({
  term,
  version,
  onClose,
  slot,
  onCreated,
  onUpdated,
}: CurriculumSlotDialogProps) {
  const creation = useCreateCurriculumSlot();
  const update = useManageCurriculumSlot();
  const editing = slot !== undefined;
  const courseOptions = useCurriculumCourses();
  const mutation = editing ? update : creation;
  const submitting = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CurriculumSlotValues>({
    resolver: zodResolver(curriculumSlotSchema),
    defaultValues: slot
      ? {
          slot_type:
            slot.slot_type ?? (slot.is_elective_slot ? "elective" : "required"),
          course_id: slot.course_id ?? "",
          slot_label: slot.slot_label ?? "",
          nominal_units: slot.nominal_units,
        }
      : {
          slot_type: "required",
          course_id: "",
          slot_label: "",
          nominal_units: 3,
        },
  });
  const pending = isSubmitting || mutation.isPending;

  async function submit(values: CurriculumSlotValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const courseValues = { ...values, slot_label: "" };
      if (slot) {
        const result = await update.mutateAsync({
          action: "edit",
          term,
          original: slot,
          values: courseValues,
        });
        onUpdated(result.versionId);
      } else {
        const result = await creation.mutateAsync({
          term,
          values: courseValues,
        });
        onCreated(result.versionId);
      }
    } catch {
      // Keep form values visible so the user can correct or retry the request.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit course / slot" : "Add course / slot"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? `Edit a course or slot in ${version.version_label}.`
              : `Add a course or slot to ${version.version_label}.`}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          aria-busy={pending}
          onSubmit={(event) => {
            void handleSubmit(submit)(event);
          }}
        >
          <fieldset
            disabled={pending}
            className="grid min-w-0 gap-4 sm:grid-cols-2"
          >
            <FormField
              label="Active course"
              htmlFor="curriculum-slot-course"
              className="sm:col-span-2"
              error={errors.course_id?.message}
            >
              <Controller
                name="course_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                    disabled={pending || courseOptions.isError}
                  >
                    <SelectTrigger
                      id="curriculum-slot-course"
                      className="w-full"
                      aria-invalid={!!errors.course_id}
                    >
                      <SelectValue placeholder="Select an active course" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      avoidCollisions={false}
                    >
                      <SelectItem value="none">
                        Select an active course
                      </SelectItem>
                      {editing &&
                        slot.course_id &&
                        !(courseOptions.data ?? []).some(
                          (course) => course.id === slot.course_id,
                        ) && (
                          <SelectItem value={slot.course_id}>
                            Current course reference unavailable or inactive
                          </SelectItem>
                        )}
                      {(courseOptions.data ?? []).map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} — {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {courseOptions.isPending && (
                <p role="status" className="text-xs text-muted-foreground">
                  Loading active courses...
                </p>
              )}
              {courseOptions.isError && (
                <div className="text-xs text-destructive">
                  <p role="alert">{slotError(courseOptions.error, false)}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={courseOptions.isFetching}
                    onClick={() => void courseOptions.refetch()}
                  >
                    Retry courses
                  </Button>
                </div>
              )}
              {courseOptions.isSuccess && courseOptions.data.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active courses are available in this department.
                </p>
              )}
            </FormField>
            <FormField
              label="Required units"
              htmlFor="curriculum-slot-units"
              error={errors.nominal_units?.message}
            >
              <Input
                id="curriculum-slot-units"
                type="number"
                min={0}
                step={0.25}
                aria-invalid={!!errors.nominal_units}
                {...register("nominal_units", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Type"
              htmlFor="curriculum-slot-type"
              error={errors.slot_type?.message}
            >
              <Controller
                name="slot_type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={pending}
                  >
                    <SelectTrigger
                      id="curriculum-slot-type"
                      className="w-full"
                      aria-invalid={!!errors.slot_type}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Required course</SelectItem>
                      <SelectItem value="elective">Elective slot</SelectItem>
                      <SelectItem value="ge">GE slot</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </fieldset>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {slotError(mutation.error, editing)}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? editing
                  ? "Saving requirement..."
                  : "Adding requirement..."
                : editing
                  ? "Save changes"
                  : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
