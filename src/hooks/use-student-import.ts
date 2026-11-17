import { useMutation } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import type { ApiSchema } from '@/lib/api'
import {
  commitStudentImport,
  previewStudentImport,
  type StudentImportBatchResult,
  type StudentImportPreview,
} from '@/routes/department-staff/students/import/student-import.api'

type StudentImportRow = ApiSchema<'StudentBatchImportRowInput'>

export interface StudentImportScope {
  readonly profileId: string
  readonly departmentId: string
}

interface StudentImportPreviewVariables {
  readonly rows: readonly StudentImportRow[]
  readonly signal: AbortSignal
}

export function useStudentImportPreview(
  scope: StudentImportScope | null,
) {
  return useMutation<
    StudentImportPreview,
    Error,
    StudentImportPreviewVariables
  >({
    mutationKey: scope
      ? staffQueryKeys.resource(
          scope.profileId,
          scope.departmentId,
          'student-import-preview',
        )
      : ['staff', 'student-import-preview', 'unavailable'],
    mutationFn: ({ rows, signal }) => {
      if (!scope) {
        throw new Error(
          'Student import previews require an authorized department scope.',
        )
      }
      return previewStudentImport(rows, signal)
    },
    retry: false,
  })
}

export function useStudentImportCommit(scope: StudentImportScope | null) {
  return useMutation<StudentImportBatchResult, Error, StudentImportPreviewVariables>({
    mutationKey: scope
      ? staffQueryKeys.resource(
          scope.profileId,
          scope.departmentId,
          'student-import-commit',
        )
      : ['staff', 'student-import-commit', 'unavailable'],
    mutationFn: ({ rows, signal }) => {
      if (!scope) {
        throw new Error('Student imports require an authorized department scope.')
      }
      return commitStudentImport(rows, signal)
    },
    retry: false,
  })
}
