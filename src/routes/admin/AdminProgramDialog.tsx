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
  validateProgramForm,
  type ProgramFormErrors,
  type ProgramFormValues,
} from './admin-programs-model'

type Program = ApiSchema<'Program'>
type ProgramRequest = Pick<
  ApiSchema<'ProgramInsert'>,
  'code' | 'name' | 'nominal_duration' | 'status' | 'department_id'
>
type Department = Pick<ApiSchema<'Department'>, 'id' | 'name' | 'faculty_id'>
type Faculty = Pick<ApiSchema<'Faculty'>, 'id' | 'name'>

function initialValues(
  program: Program | null,
  departments: readonly Department[],
): ProgramFormValues {
  const department = departments.find(
    (item) => item.id === program?.department_id,
  )
  return {
    code: program?.code ?? '',
    name: program?.name ?? '',
    duration: program ? String(program.nominal_duration) : '4',
    facultyId: department?.faculty_id ?? '',
    departmentId: program?.department_id ?? '',
    status: program?.status ?? 'active',
  }
}

export function AdminProgramDialog({
  program,
  faculties,
  departments,
  catalogsLoading,
  onOpenChange,
  onSubmit,
}: {
  program: Program | null
  faculties: readonly Faculty[]
  departments: readonly Department[]
  catalogsLoading: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (request: ProgramRequest) => Promise<void>
}) {
  const [values, setValues] = useState(() =>
    initialValues(program, departments),
  )
  const [errors, setErrors] = useState<ProgramFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  function update<K extends keyof ProgramFormValues>(
    key: K,
    value: ProgramFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateProgramForm(values, departments, faculties)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmissionError(null)
    setSubmitting(true)
    const request = {
      code: values.code.trim(),
      name: values.name.trim(),
      nominal_duration: Number(values.duration),
      status: values.status,
      department_id: values.departmentId,
    }

    try {
      await onSubmit(request)
    } catch (requestError: unknown) {
      setSubmissionError(
        requestError instanceof Error
          ? requestError.message
          : 'The program could not be saved.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const availableDepartments = departments.filter(
    (department) =>
      !values.facultyId || department.faculty_id === values.facultyId,
  )

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {program ? 'Edit program' : 'Add program'}
          </DialogTitle>
          <DialogDescription>
            Program organization is assigned to a department and shown by its
            parent faculty.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit} noValidate>
          {submissionError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
            >
              {submissionError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Program code"
              htmlFor="program-code"
              error={errors.code}
            >
              <Input
                id="program-code"
                value={values.code}
                maxLength={250}
                aria-invalid={Boolean(errors.code)}
                onChange={(event) => update('code', event.currentTarget.value)}
              />
            </FormField>
            <FormField
              label="Duration in years"
              htmlFor="program-duration"
              error={errors.duration}
            >
              <Input
                id="program-duration"
                type="number"
                min={1}
                step="any"
                value={values.duration}
                aria-invalid={Boolean(errors.duration)}
                onChange={(event) =>
                  update('duration', event.currentTarget.value)
                }
              />
            </FormField>
          </div>

          <FormField
            label="Program name"
            htmlFor="program-name"
            error={errors.name}
          >
            <Input
              id="program-name"
              value={values.name}
              maxLength={250}
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => update('name', event.currentTarget.value)}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Faculty"
              htmlFor="program-faculty"
              error={errors.facultyId}
            >
              <Select
                value={values.facultyId}
                onValueChange={(value) => {
                  update('facultyId', value)
                  update('departmentId', '')
                }}
                disabled={catalogsLoading || submitting}
              >
                <SelectTrigger
                  id="program-faculty"
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
            <FormField
              label="Department"
              htmlFor="program-department"
              error={errors.departmentId}
            >
              <Select
                value={values.departmentId}
                onValueChange={(value) => update('departmentId', value)}
                disabled={
                  catalogsLoading || submitting || !values.facultyId
                }
              >
                <SelectTrigger
                  id="program-department"
                  className="w-full"
                  aria-invalid={Boolean(errors.departmentId)}
                >
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Status" htmlFor="program-status">
            <Select
              value={values.status}
              onValueChange={(value) => {
                if (
                  value === 'active' ||
                  value === 'inactive' ||
                  value === 'archived'
                ) {
                  update('status', value)
                }
              }}
              disabled={submitting}
            >
              <SelectTrigger
                id="program-status"
                className="w-full sm:max-w-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {catalogsLoading && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Loading faculty and department choices…
            </p>
          )}
          {!catalogsLoading && departments.length === 0 && (
            <p role="alert" className="text-sm text-destructive">
              Add a department before creating or moving a program.
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
            <Button
              type="submit"
              disabled={
                submitting ||
                catalogsLoading ||
                faculties.length === 0 ||
                departments.length === 0
              }
            >
              {submitting
                ? 'Saving…'
                : program
                  ? 'Save changes'
                  : 'Add program'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
