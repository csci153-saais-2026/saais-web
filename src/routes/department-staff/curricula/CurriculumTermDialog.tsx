import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/features/form-field";
import { Button } from "@/components/ui/button";
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
  useCreateCurriculumTerm,
  useManageCurriculumTerm,
} from "@/hooks/use-curricula";
import type { CurriculumTerm, CurriculumVersion } from "./curricula.api";
import {
  curriculumTermSchema,
  type CurriculumTermValues,
} from "./curriculum-term.schema";

function termError(error: unknown, editing: boolean): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return editing
        ? "You do not have permission to edit this curriculum term."
        : "You do not have permission to add terms to this curriculum.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again.";
    if (error.isConflict)
      return `The term could not be ${editing ? "updated" : "added"} because the position or curriculum changed or its history is protected. ${error.message}`;
    if (error.isRateLimited)
      return "Too many requests. Wait before trying again.";
    if (error.isNetworkError)
      return `The ${editing ? "update" : "creation"} result could not be confirmed. Refresh the curriculum before submitting again.`;
  }
  return error instanceof Error
    ? error.message
    : `The term could not be ${editing ? "updated" : "added"}.`;
}

type CurriculumTermDialogProps = {
  version: CurriculumVersion;
  onClose: () => void;
} & (
  | {
      term?: undefined;
      onAdded: (versionId: string) => void;
      onUpdated?: never;
    }
  | {
      term: CurriculumTerm;
      onUpdated: (versionId: string) => void;
      onAdded?: never;
    }
);

export function CurriculumTermDialog({
  version,
  onClose,
  onAdded,
  term,
  onUpdated,
}: CurriculumTermDialogProps) {
  const creation = useCreateCurriculumTerm();
  const update = useManageCurriculumTerm();
  const editing = term !== undefined;
  const mutation = editing ? update : creation;
  const submitting = useRef(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CurriculumTermValues>({
    resolver: zodResolver(curriculumTermSchema),
    defaultValues: term
      ? { year_level: term.year_level, term_sequence: term.term_sequence }
      : { year_level: 1, term_sequence: 1 },
  });
  const pending = isSubmitting || mutation.isPending;
  async function submit(values: CurriculumTermValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      if (term) {
        const result = await update.mutateAsync({
          action: "edit",
          original: term,
          values,
        });
        onUpdated(result.versionId);
      } else {
        const result = await creation.mutateAsync({
          versionId: version.id,
          values,
        });
        onAdded(result.versionId);
      }
    } catch {
      // Keep the user's position and show the normalized error below.
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
          <DialogTitle>{editing ? "Edit term" : "Add term"}</DialogTitle>
          <DialogDescription className="sr-only">
            {editing
              ? `Edit a term in ${version.version_label}.`
              : `Add a term to ${version.version_label}.`}
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
              label="Year level"
              htmlFor="curriculum-term-year"
              error={errors.year_level?.message}
            >
              <Controller
                name="year_level"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                    disabled={pending}
                  >
                    <SelectTrigger
                      id="curriculum-term-year"
                      className="w-full"
                      aria-invalid={!!errors.year_level}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 8 }, (_, index) => (
                        <SelectItem key={index + 1} value={String(index + 1)}>
                          {index + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Term"
              htmlFor="curriculum-term-sequence"
              error={errors.term_sequence?.message}
            >
              <Controller
                name="term_sequence"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                    disabled={pending}
                  >
                    <SelectTrigger
                      id="curriculum-term-sequence"
                      className="w-full"
                      aria-invalid={!!errors.term_sequence}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                      <SelectItem value="3">Midyear</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </fieldset>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {termError(mutation.error, editing)}
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
                  ? "Saving term..."
                  : "Save changes"
                : pending
                  ? "Adding term..."
                  : "Add term"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
