import { apiClient, unwrapApiResult } from '@/lib/api'
import type { OperationRequestBody, OperationResponse } from '@/lib/api'

export type BulkAdviserReassignmentRequest = OperationRequestBody<'bulkReassignAdvisers'>
export type BulkAdviserReassignmentResponse = OperationResponse<'bulkReassignAdvisers'>

export async function bulkReassignAdvisers(
  body: BulkAdviserReassignmentRequest,
  signal?: AbortSignal,
): Promise<BulkAdviserReassignmentResponse> {
  const result = await apiClient.POST('/functions/v1/adviser-assignments/bulk-reassign', {
    body,
    signal,
  })

  const payload = unwrapApiResult<BulkAdviserReassignmentResponse>(result)
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.assignments)) {
    throw new Error('The adviser reassignment service returned an invalid response.')
  }

  return payload
}
