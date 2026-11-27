import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/features/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api";
import {
  useCreateSchoolTerm,
  useUpdateSchoolTerm,
} from "@/hooks/use-academic-terms";
import type { SchoolTerm } from "./academic-terms.api";
import {
  schoolTermFormSchema,
  type SchoolTermFormValues,
} from "./school-term.schema";

function getWriteErrorMessage(error: unknown, editing: boolean): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return "Your account is not permitted to manage school terms for this department.";
    }
    if (error.isAuthError) {
      return "Your session could not be verified. Sign in again and retry.";
    }
    if (error.isConflict) {
      return `The term could not be ${editing ? "updated" : "created"} because of a conflict. ${error.message}`;
    }
    if (error.isNetworkError) {
      return "The write result could not be confirmed. Refresh the academic term list before retrying.";
    }
    if (error.isRateLimited) {
      return "Too many requests. Wait before submitting again.";
    }
    return error.message;
  }

  if (error instanceof Error) return error.message;
  return `The school term could not be ${editing ? "updated" : "created"}.`;
}

export function SchoolTermDialog({
  term,
  onClose,
  onSaved,
}: {
  term?: SchoolTerm;
  onClose: () => void;
  onSaved: () => void;
}) {
  const create = useCreateSchoolTerm();
  const update = useUpdateSchoolTerm();
  const editing = term !== undefined;
  const submitting = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SchoolTermFormValues>({
    resolver: zodResolver(schoolTermFormSchema),
    defaultValues: term
      ? {
          start_year: term.start_year,
          end_year: term.end_year,
          term_type: term.term_type,
          starts_on: term.starts_on ?? "",
          ends_on: term.ends_on,
          encoding_deadline: term.encoding_deadline ?? "",
        }
      : {
          start_year: new Date().getFullYear(),
          end_year: new Date().getFullYear() + 1,
          term_type: "1st Semester",
          starts_on: "",
          ends_on: "",
          encoding_deadline: "",
        },
  });
  const pending = isSubmitting || create.isPending || update.isPending;
  const hasError = editing ? update.isError : create.isError;
  const error = editing ? update.error : create.error;

  async function submit(values: SchoolTermFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      if (term) {
        await update.mutateAsync({ original: term, values });
      } else {
        await create.mutateAsync(values);
      }
      onSaved();
    } catch {
      // Mutation errors are rendered below; keeping the form mounted preserves the user's input.
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
            {editing ? "Edit academic term" : "Create academic term"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update calendar dates and term identity. Institution-wide locks and server-recorded closure details cannot be edited here."
              : "Add a calendar term. Summer/Midyear is stored as the contract term type Summer."}
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
          <fieldset disabled={pending} className="grid min-w-0 gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Starting academic year"
                htmlFor="school-term-start-year"
                error={errors.start_year?.message}
              >
                <Input
                  id="school-term-start-year"
                  type="number"
                  min={1900}
                  max={2999}
                  step={1}
                  aria-invalid={!!errors.start_year}
                  {...register("start_year", { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="Ending academic year"
                htmlFor="school-term-end-year"
                error={errors.end_year?.message}
              >
                <Input
                  id="school-term-end-year"
                  type="number"
                  min={1901}
                  max={3000}
                  step={1}
                  aria-invalid={!!errors.end_year}
                  {...register("end_year", { valueAsNumber: true })}
                />
              </FormField>
            </div>

            <FormField
              label="Term type"
              htmlFor="school-term-type"
              error={errors.term_type?.message}
            >
              <select
                id="school-term-type"
                className="min-h-11 w-full rounded-sm border border-input bg-card px-3"
                aria-invalid={!!errors.term_type}
                {...register("term_type")}
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer/Midyear</option>
              </select>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Start date"
                htmlFor="school-term-start-date"
                error={errors.starts_on?.message}
              >
                <Input
                  id="school-term-start-date"
                  type="date"
                  aria-invalid={!!errors.starts_on}
                  {...register("starts_on")}
                />
              </FormField>
              <FormField
                label="Actual end date"
                htmlFor="school-term-end-date"
                error={errors.ends_on?.message}
              >
                <Input
                  id="school-term-end-date"
                  type="date"
                  aria-invalid={!!errors.ends_on}
                  {...register("ends_on")}
                />
              </FormField>
            </div>

            <FormField
              label="Encoding deadline"
              htmlFor="school-term-encoding-deadline"
              error={errors.encoding_deadline?.message}
            >
              <Input
                id="school-term-encoding-deadline"
                type="date"
                aria-invalid={!!errors.encoding_deadline}
                {...register("encoding_deadline")}
              />
            </FormField>
          </fieldset>

          {hasError && (
            <p role="alert" className="text-sm text-destructive">
              {getWriteErrorMessage(error, editing)}
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
                  ? "Saving term…"
                  : "Save changes"
                : pending
                  ? "Creating term…"
                  : "Create term"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
