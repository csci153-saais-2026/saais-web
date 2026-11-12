import type {
  components,
  operations,
  paths,
} from '../../../contract/generated/schema'

export type { components, operations, paths }

/**
 * Extract any named component schema from `contract/openapi.yaml`.
 * Example: `type Course = ApiSchema<'Course'>`
 */
export type ApiSchema<Name extends keyof components['schemas']> =
  components['schemas'][Name]

/**
 * Extract query parameter shape for a named OpenAPI `operationId`.
 */
export type OperationQuery<Op extends keyof operations> =
  operations[Op] extends { parameters: { query?: infer Q } }
    ? NonNullable<Q>
    : never

/**
 * Extract path parameter shape for a named OpenAPI `operationId`.
 */
export type OperationPathParams<Op extends keyof operations> =
  operations[Op] extends { parameters: { path: infer P } } ? P : never

/**
 * Extract JSON request body shape for a named OpenAPI `operationId`.
 */
export type OperationRequestBody<Op extends keyof operations> =
  operations[Op] extends {
    requestBody?: { content: { 'application/json': infer B } }
  }
    ? B
    : operations[Op] extends {
          requestBody: { content: { 'application/json': infer B } }
        }
      ? B
      : never

/**
 * Extract primary success (`200` or `201`) JSON response payload for a named `operationId`.
 */
export type OperationResponse<Op extends keyof operations> =
  operations[Op] extends {
    responses: { 200: { content: { 'application/json': infer R } } }
  }
    ? R
    : operations[Op] extends {
          responses: { 201: { content: { 'application/json': infer R } } }
        }
      ? R
      : void

/**
 * Parsed PostgREST `Content-Range` response header (for example `0-19/142` or empty-set range).
 */
export interface ContentRangeInfo {
  readonly start: number | null
  readonly end: number | null
  readonly total: number | null
}
