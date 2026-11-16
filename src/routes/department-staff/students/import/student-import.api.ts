import { apiClient, unwrapApiResult } from '@/lib/api'
import type { ApiSchema, OperationResponse } from '@/lib/api'

export type StudentImportPreview = OperationResponse<'importStudentsBatch'>
type StudentImportRow = ApiSchema<'StudentBatchImportRowInput'>

function assertPreviewResponse(
  value: StudentImportPreview | undefined,
  expectedRows: readonly StudentImportRow[],
): StudentImportPreview {
  if (
    !value ||
    value.mode !== 'preview' ||
    !Array.isArray(value.results) ||
    value.results.length !== expectedRows.length ||
    ![value.valid_count, value.warning_count, value.error_count].every(
      (count) => Number.isSafeInteger(count) && count >= 0,
    ) ||
    value.imported_count !== 0
  ) {
    throw new Error('The student import preview service returned an invalid response.')
  }

  const outcomeCounts = { valid: 0, warning: 0, error: 0 }
  for (const [index, result] of value.results.entries()) {
    if (
      result.row_number !== expectedRows[index].row_number ||
      result.student_number !== expectedRows[index].student_number ||
      typeof result.email !== 'string' ||
      result.email.trim().toLowerCase() !==
        expectedRows[index].email.trim().toLowerCase()
    ) {
      throw new Error(
        'The student import preview service returned invalid row results.',
      )
    }

    switch (result.outcome) {
      case 'valid':
        outcomeCounts.valid += 1
        break
      case 'warning':
        outcomeCounts.warning += 1
        break
      case 'error':
        outcomeCounts.error += 1
        break
      default:
        throw new Error(
          'The student import preview service returned invalid row results.',
        )
    }
  }

  if (
    value.valid_count !== outcomeCounts.valid ||
    value.warning_count !== outcomeCounts.warning ||
    value.error_count !== outcomeCounts.error
  ) {
    throw new Error(
      'The student import preview service returned inconsistent outcome counts.',
    )
  }

  return value
}

export async function previewStudentImport(
  rows: readonly StudentImportRow[],
  signal?: AbortSignal,
): Promise<StudentImportPreview> {
  const result = await apiClient.POST('/functions/v1/students/import', {
    body: {
      mode: 'preview',
      rows: [...rows],
    },
    signal,
  })
  const response = unwrapApiResult<StudentImportPreview>(result)
  return assertPreviewResponse(response, rows)
}
