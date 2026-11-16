import {
  apiClient,
  parseContentRange,
  postgrestFilter,
  unwrapApiResult,
} from '@/lib/api'
import type {
  ApiSchema,
  OperationQuery,
  OperationRequestBody,
  OperationResponse,
} from '@/lib/api'
import { z } from 'zod'

export type BulkAdviserReassignmentRequest = OperationRequestBody<'bulkReassignAdvisers'>
export type BulkAdviserReassignmentResponse = OperationResponse<'bulkReassignAdvisers'>
export type AdviserAssignment = ApiSchema<'AdviserAssignment'>

const ASSIGNMENT_HISTORY_LIMIT = 1000
const adviserAssignmentHistorySchema = z.object({
  id: z.uuid(),
  adviser_id: z.uuid(),
  adviser_name: z.string().nullable().optional(),
  adviser_email: z.string().nullable().optional(),
  adviser_faculty_name: z.string().nullable().optional(),
  adviser_consultation_hours: z.string().nullable().optional(),
  student_id: z.uuid(),
  start_date: z.iso.date(),
  end_date: z.iso.date().nullable(),
  handed_over_to_adviser_id: z.uuid().nullable().optional(),
  handed_over_to_name: z.string().nullable().optional(),
  handover_label: z.string().nullable().optional(),
  created_at: z.iso.datetime(),
}).strict()
const reassignmentResponseSchema = z.object({
  reassigned_count: z.number().int().min(0),
  assignments: z.array(
    z.object({
      id: z.uuid(),
      adviser_id: z.uuid(),
      adviser_name: z.string().nullable().optional(),
      adviser_email: z.string().nullable().optional(),
      adviser_faculty_name: z.string().nullable().optional(),
      adviser_consultation_hours: z.string().nullable().optional(),
      student_id: z.uuid(),
      start_date: z.iso.date(),
      end_date: z.iso.date().nullable().optional(),
      handed_over_to_adviser_id: z.uuid().nullable().optional(),
      handed_over_to_name: z.string().nullable().optional(),
      handover_label: z.string().nullable().optional(),
      created_at: z.iso.datetime(),
    }),
  ),
}).strict()

function completeRead(
  result: { data?: unknown; error?: unknown; response: Response },
): AdviserAssignment[] {
  const rows = unwrapApiResult<unknown>(result)
  if (!Array.isArray(rows)) {
    throw new Error('The adviser assignment service returned invalid data.')
  }

  const range = parseContentRange(result.response.headers.get('Content-Range'))
  if (
    rows.length >= ASSIGNMENT_HISTORY_LIMIT ||
    result.response.status === 206 ||
    (range?.total != null && range.total > rows.length)
  ) {
    throw new Error(
      'Adviser assignment history is incomplete; the full history could not be loaded.',
    )
  }

  const parsedRows = z.array(adviserAssignmentHistorySchema).safeParse(rows)
  if (!parsedRows.success) {
    throw new Error(
      'The adviser assignment service returned invalid or incomplete history.',
    )
  }
  return parsedRows.data
}

export async function listStudentAdviserAssignments(
  studentIds: readonly string[],
  signal?: AbortSignal,
): Promise<AdviserAssignment[]> {
  const ids = [...new Set(studentIds)]
  if (ids.length === 0) return []

  const query: OperationQuery<'listAdviserAssignments'> = {
    student_id: postgrestFilter.inList(ids),
    select:
      'id,adviser_id,adviser_name,adviser_email,adviser_faculty_name,adviser_consultation_hours,student_id,start_date,end_date,handed_over_to_adviser_id,handed_over_to_name,handover_label,created_at',
    order: 'student_id.asc,start_date.asc,id.asc',
    limit: ASSIGNMENT_HISTORY_LIMIT,
    offset: 0,
  }
  const result = await apiClient.GET('/rest/v1/adviser_assignment', {
    params: { query },
    signal,
  })
  const requestedIds = new Set(ids)
  return completeRead(result).filter((assignment) =>
    requestedIds.has(assignment.student_id),
  )
}

export async function bulkReassignAdvisers(
  body: BulkAdviserReassignmentRequest,
  signal?: AbortSignal,
): Promise<BulkAdviserReassignmentResponse> {
  const requestedIds = new Set(body.student_ids)
  if (
    body.student_ids.length === 0 ||
    body.student_ids.length > 500 ||
    requestedIds.size !== body.student_ids.length
  ) {
    throw new Error(
      'A reassignment requires between one and 500 unique students.',
    )
  }

  const result = await apiClient.POST('/functions/v1/adviser-assignments/bulk-reassign', {
    body,
    signal,
  })

  const payload = unwrapApiResult<unknown>(result)
  const parsedPayload = reassignmentResponseSchema.safeParse(payload)
  if (!parsedPayload.success) {
    throw new Error(
      'The adviser reassignment service returned an invalid response.',
    )
  }

  const assignments = parsedPayload.data.assignments
  const returnedIds = new Set(assignments.map((assignment) => assignment.student_id))
  const isCompleteAtomicResult =
    parsedPayload.data.reassigned_count === body.student_ids.length &&
    assignments.length === body.student_ids.length &&
    returnedIds.size === body.student_ids.length &&
    assignments.every(
      (assignment) =>
        requestedIds.has(assignment.student_id) &&
        assignment.adviser_id === body.adviser_id &&
        assignment.start_date === body.effective_since &&
        assignment.end_date == null,
    )
  if (!isCompleteAtomicResult) {
    throw new Error(
      'The adviser reassignment service did not confirm the complete atomic reassignment.',
    )
  }

  return parsedPayload.data
}
