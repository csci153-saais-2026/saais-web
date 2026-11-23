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
import type { CurriculumVersion, Program } from "./curricula.api";
import {
  curriculumVersionEditSchema,
  curriculumVersionSchema,
  type CurriculumVersionValues,
} from "./curriculum-version.schema";
import {
  useCreateCurriculumVersion,
  useUpdateCurriculumVersion,
} from "@/hooks/use-curricula";

function versionError(error: unknown, editing: boolean): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return editing
        ? "You do not have permission to edit this curriculum version."
        : "You do not have permission to create a version for this program.";
    if (error.isConflict)
      return `The version could not be ${editing ? "updated" : "created"} because of a conflict. ${error.message}`;
    if (error.isRateLimited)
      return "Too many requests. Wait before submitting again.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again.";
    if (error.isNetworkError)
      return editing
        ? "The update result could not be confirmed. Refresh the version list before submitting again."
        : "The creation result could not be confirmed. Refresh the version list before submitting again to avoid a duplicate.";
  }
  return error instanceof Error
    ? error.message
    : `The version could not be ${editing ? "updated" : "created"}.`;
}

type CurriculumVersionDialogProps = {
  programs: Program[];
  versions: CurriculumVersion[];
  onClose: () => void;
} & (
  | {
      version?: undefined;
      onCreated: (versionId: string) => void;
      onUpdated?: never;
    }
  | {
      version: CurriculumVersion;
      onUpdated: (versionId: string) => void;
      onCreated?: never;
    }
);

export function CurriculumVersionDialog({
  programs,
  versions,
  onClose,
  onCreated,
  version,
  onUpdated,
}: CurriculumVersionDialogProps) {
  const creation = useCreateCurriculumVersion();
  const update = useUpdateCurriculumVersion();
  const editing = version !== undefined;
  const programCode = programs.find(
    (program) => program.id === version?.program_id,
  )?.code;
  const initialYear =
    version &&
    programCode &&
    version.version_label.startsWith(`${programCode} `)
      ? version.version_label.slice(programCode.length + 1)
      : (version?.version_label ?? "");
  const mutation = editing ? update : creation;
  const submitting = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CurriculumVersionValues>({
    resolver: zodResolver(
      editing ? curriculumVersionEditSchema : curriculumVersionSchema,
    ),
    defaultValues: version
      ? {
          program_id: version.program_id,
          version_label: initialYear,
          effective_start: version.effective_start,
          effective_end: version.effective_end ?? "",
          total_units: version.total_units,
          delinquency_threshold: version.delinquency_threshold,
          status: version.status,
        }
      : {
          program_id: programs[0]?.id ?? "",
          clone_from_version_id: "",
          version_label: "",
          effective_start: "",
          effective_end: "",
          total_units: 147,
          delinquency_threshold: 0,
          status: "draft",
        },
  });
  const pending = isSubmitting || mutation.isPending;

  async function submit(values: CurriculumVersionValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const code = programs.find(
        (program) => program.id === values.program_id,
      )?.code;
      const label = values.version_label.trim();
      const input = {
        ...values,
        version_label:
          code && !label.toLowerCase().startsWith(`${code.toLowerCase()} `)
            ? `${code} ${label}`
            : label,
      };
      const labelLimit = editing ? 250 : 100;
      if (input.version_label.length > labelLimit) {
        setError("version_label", {
          type: "maxLength",
          message: `Use at most ${labelLimit} characters after adding the program code.`,
        });
        return;
      }
      if (version) {
        const result = await update.mutateAsync({
          original: version,
          values: input,
        });
        onUpdated(result.version.id);
      } else {
        const result = await creation.mutateAsync(input);
        onCreated(result.version.id);
      }
    } catch {
      // Preserve inputs; the normalized mutation error is shown below.
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
          <DialogTitle>{editing ? "Edit version" : "Add version"}</DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? "Update curriculum version details."
              : "Add a curriculum version."}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            void handleSubmit(submit)(event);
          }}
          className="space-y-4"
          aria-busy={pending}
        >
          <fieldset
            disabled={pending}
            className="grid min-w-0 gap-4 sm:grid-cols-2"
          >
            <FormField
              label="Program"
              htmlFor="new-version-program"
              error={errors.program_id?.message}
            >
              {editing ? (
                <>
                  <Input
                    id="new-version-program"
                    readOnly
                    value={
                      programs.find(
                        (program) => program.id === version.program_id,
                      )?.code ?? "Program unavailable"
                    }
                  />
                  <input type="hidden" {...register("program_id")} />
                </>
              ) : (
                <Controller
                  name="program_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={pending}
                    >
                      <SelectTrigger
                        id="new-version-program"
                        className="w-full"
                        aria-invalid={!!errors.program_id}
                      >
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
            <FormField
              label="Academic year"
              htmlFor="new-version-label"
              error={errors.version_label?.message}
            >
              <Input
                id="new-version-label"
                maxLength={editing ? 250 : 100}
                aria-invalid={!!errors.version_label}
                {...register("version_label")}
              />
            </FormField>
            {!editing && (
              <FormField
                label="Copy courses from (optional)"
                htmlFor="new-version-source"
              >
                <Controller
                  name="clone_from_version_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || "blank"}
                      onValueChange={(value) =>
                        field.onChange(value === "blank" ? "" : value)
                      }
                      disabled={pending}
                    >
                      <SelectTrigger id="new-version-source" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blank">
                          Start with a blank version
                        </SelectItem>
                        {versions.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.version_label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}
            <FormField
              label="Required units"
              htmlFor="new-version-units"
              error={errors.total_units?.message}
            >
              <Input
                id="new-version-units"
                type="number"
                min={0}
                step={0.25}
                aria-invalid={!!errors.total_units}
                {...register("total_units", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Effective from"
              htmlFor="new-version-start"
              error={errors.effective_start?.message}
            >
              <Input
                id="new-version-start"
                type="date"
                aria-invalid={!!errors.effective_start}
                {...register("effective_start")}
              />
            </FormField>
            <FormField
              label="Effective until (optional)"
              htmlFor="version-end"
              error={errors.effective_end?.message}
            >
              <Input
                id="version-end"
                type="date"
                aria-invalid={!!errors.effective_end}
                {...register("effective_end")}
              />
            </FormField>
            <FormField
              label="Status"
              htmlFor="new-version-status"
              error={errors.status?.message}
            >
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={pending}
                  >
                    <SelectTrigger
                      id="new-version-status"
                      className="w-full"
                      aria-invalid={!!errors.status}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">draft</SelectItem>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="teach_out">teach out</SelectItem>
                      <SelectItem value="retired">retired</SelectItem>
                      <SelectItem value="closed">closed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </fieldset>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {versionError(mutation.error, editing)}
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
              {editing
                ? pending
                  ? "Saving version..."
                  : "Save changes"
                : pending
                  ? "Creating version..."
                  : "Add version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
