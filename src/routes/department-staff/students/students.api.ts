import { apiClient, unwrapApiResult } from '@/lib/api'
import type { OperationQuery, OperationResponse } from '@/lib/api'

type StudentRosterQuery = Pick<
  OperationQuery<'listStudentRoster'>,
  'department_id'
>

export function listStudentRoster(
  query: StudentRosterQuery,
  signal?: AbortSignal,
): Promise<OperationResponse<'listStudentRoster'>> {
  return apiClient
    .GET('/functions/v1/students', {
      params: { query },
      signal,
    })
    .then((result) => {
      const roster = unwrapApiResult<OperationResponse<'listStudentRoster'>>(
        result,
      )
      if (!roster || !Array.isArray(roster.items)) {
        throw new Error('The student roster service returned an invalid response.')
      }
      return roster
    })
}
