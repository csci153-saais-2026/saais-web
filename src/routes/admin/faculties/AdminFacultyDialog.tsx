import { useState, type FormEvent } from "react";
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
import type { ApiSchema } from "@/lib/api";
import {
  buildFacultyRequest,
  validateFacultyForm,
  type FacultyFormErrors,
  type FacultyFormValues,
} from "./admin-faculties-model";

type Faculty = ApiSchema<"Faculty">;
type FacultyRequest = Pick<ApiSchema<"FacultyInsert">, "name" | "code">;

export function AdminFacultyDialog({
  faculty,
  onOpenChange,
  onSubmit,
}: {
  faculty: Faculty | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: FacultyRequest) => Promise<void>;
}) {
  const [values, setValues] = useState<FacultyFormValues>(() => ({
    name: faculty?.name ?? "",
    code: faculty?.code ?? "",
  }));
  const [errors, setErrors] = useState<FacultyFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  function update<K extends keyof FacultyFormValues>(
    key: K,
    value: FacultyFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFacultyForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmissionError(null);
    setSubmitting(true);
    try {
      await onSubmit(buildFacultyRequest(values));
    } catch (requestError: unknown) {
      setSubmissionError(
        requestError instanceof Error
          ? requestError.message
          : "The faculty could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{faculty ? "Edit faculty" : "Add faculty"}</DialogTitle>
          <DialogDescription>
            Faculty records support institution-wide department and program
            organization.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit} noValidate>
          {submissionError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
            >
              {submissionError}
            </p>
          )}
          <FormField
            label="Faculty name"
            htmlFor="faculty-name"
            error={errors.name}
          >
            <Input
              id="faculty-name"
              value={values.name}
              maxLength={250}
              aria-invalid={Boolean(errors.name)}
              disabled={submitting}
              onChange={(event) => update("name", event.currentTarget.value)}
            />
          </FormField>
          <FormField
            label="Faculty code"
            htmlFor="faculty-code"
            hint="Optional; up to 50 characters."
            error={errors.code}
          >
            <Input
              id="faculty-code"
              value={values.code}
              maxLength={50}
              aria-invalid={Boolean(errors.code)}
              disabled={submitting}
              onChange={(event) => update("code", event.currentTarget.value)}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : faculty
                  ? "Save faculty"
                  : "Add faculty"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
