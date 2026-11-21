import { useState, type FormEvent } from 'react'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApiSchema } from '@/lib/api'
import {
  buildDepartmentRequest,
  validateDepartmentForm,
  type DepartmentFormErrors,
  type DepartmentFormValues,
} from './admin-faculties-model'

type Department = ApiSchema<'Department'>
type Faculty = Pick<ApiSchema<'Faculty'>, 'id' | 'name'>
type DepartmentRequest = Pick<
  ApiSchema<'DepartmentInsert'>,
  'faculty_id' | 'name' | 'code'
>

export function AdminDepartmentDialog({
  department,
  faculties,
  onOpenChange,
  onSubmit,
}: {
  department: Department | null
  faculties: readonly Faculty[]
  onOpenChange: (open: boolean) => void
  onSubmit: (request: DepartmentRequest) => Promise<void>
}) {
  const [values, setValues] = useState<DepartmentFormValues>(() => ({
    name: department?.name ?? '',
    code: department?.code ?? '',
    facultyId: department?.faculty_id ?? '',
  }))
  const [errors, setErrors] = useState<DepartmentFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  function update<K extends keyof DepartmentFormValues>(
    key: K,
    value: DepartmentFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateDepartmentForm(values, faculties)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmissionError(null)
    setSubmitting(true)
    try {
      await onSubmit(buildDepartmentRequest(values))
    } catch (requestError: unknown) {
      setSubmissionError(
        requestError instanceof Error
          ? requestError.message
          : 'The department could not be saved.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {department ? 'Edit department' : 'Add department'}
          </DialogTitle>
          <DialogDescription>
            Assign the department to its parent faculty. Related records are not
            moved or deleted automatically.
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
            label="Department name"
            htmlFor="department-name"
            error={errors.name}
          >
            <Input
              id="department-name"
              value={values.name}
              maxLength={250}
              aria-invalid={Boolean(errors.name)}
              disabled={submitting}
              onChange={(event) => update('name', event.currentTarget.value)}
            />
          </FormField>
          <FormField
            label="Department code"
            htmlFor="department-code"
            hint="Optional; up to 50 characters."
            error={errors.code}
          >
            <Input
              id="department-code"
              value={values.code}
              maxLength={50}
              aria-invalid={Boolean(errors.code)}
              disabled={submitting}
              onChange={(event) => update('code', event.currentTarget.value)}
            />
          </FormField>
          <FormField
            label="Parent faculty"
            htmlFor="department-faculty"
            error={errors.facultyId}
          >
            <Select
              value={values.facultyId}
              onValueChange={(value) => update('facultyId', value)}
              disabled={faculties.length === 0 || submitting}
            >
              <SelectTrigger
                id="department-faculty"
                className="w-full"
                aria-invalid={Boolean(errors.facultyId)}
              >
                <SelectValue placeholder="Select a faculty" />
              </SelectTrigger>
              <SelectContent>
                {faculties.map((faculty) => (
                  <SelectItem key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {faculties.length === 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              Add a faculty before creating a department.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || faculties.length === 0}>
              {submitting
                ? 'Saving…'
                : department
                  ? 'Save department'
                  : 'Add department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
