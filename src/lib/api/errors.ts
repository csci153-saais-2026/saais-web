import type { ApiSchema } from './types'

export type ContractErrorPayload = ApiSchema<'Error'>
export type GatewayAuthErrorPayload = ApiSchema<'SupabaseGatewayAuthError'>

/**
 * Canonical application, PostgREST, gateway, and client error codes used across SAAIS.
 */
export const API_ERROR_CODES = {
  // Client / Auth preflight codes
  AUTH_SESSION_REQUIRED: 'AUTH_SESSION_REQUIRED',
  MISSING_API_KEY: 'MISSING_API_KEY',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_API_ERROR: 'UNKNOWN_API_ERROR',
  GATEWAY_AUTH_ERROR: 'GATEWAY_AUTH_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',

  // Documented SAAIS domain & PostgREST / PostgreSQL error codes
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_ENROLLED: 'ALREADY_ENROLLED',
  GRADE_ALREADY_RECORDED: 'GRADE_ALREADY_RECORDED',
  ENROLLMENT_CONFIRMATION_REQUIRED: 'ENROLLMENT_CONFIRMATION_REQUIRED',
  JWT_EXPIRED_OR_INVALID: 'PGRST301',
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  INSUFFICIENT_PRIVILEGE: '42501',
} as const

export type KnownApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

export interface NormalizedApiError {
  readonly status: number
  readonly code: string
  readonly message: string
  readonly details: string | null
  readonly hint: string | null
  readonly retryAfterSeconds: number | null
  readonly isAuthError: boolean
  readonly isForbidden: boolean
  readonly isNotFound: boolean
  readonly isConflict: boolean
  readonly isRateLimited: boolean
  readonly isNetworkError: boolean
}

/**
 * Consistent typed `Error` thrown by `unwrapApiResult` and client auth preflight checks.
 * Normalizes both `components.schemas.Error` and `components.schemas.SupabaseGatewayAuthError`.
 */
export class ApiClientError extends Error implements NormalizedApiError {
  readonly status: number
  readonly code: string
  readonly details: string | null
  readonly hint: string | null
  readonly retryAfterSeconds: number | null
  readonly isAuthError: boolean
  readonly isForbidden: boolean
  readonly isNotFound: boolean
  readonly isConflict: boolean
  readonly isRateLimited: boolean
  readonly isNetworkError: boolean

  constructor(normalized: NormalizedApiError, options?: { cause?: unknown }) {
    super(normalized.message, options)
    this.name = 'ApiClientError'
    this.status = normalized.status
    this.code = normalized.code
    this.details = normalized.details
    this.hint = normalized.hint
    this.retryAfterSeconds = normalized.retryAfterSeconds
    this.isAuthError = normalized.isAuthError
    this.isForbidden = normalized.isForbidden
    this.isNotFound = normalized.isNotFound
    this.isConflict = normalized.isConflict
    this.isRateLimited = normalized.isRateLimited
    this.isNetworkError = normalized.isNetworkError
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  return null
}

export function parseRetryAfterSeconds(
  response?: Pick<Response, 'headers'> | null,
): number | null {
  const raw = response?.headers?.get('Retry-After')
  if (!raw) return null
  const value = raw.trim()
  if (/^\d+$/.test(value)) {
    const seconds = Number(value)
    return Number.isSafeInteger(seconds) ? seconds : null
  }
  const time = Date.parse(value)
  return Number.isFinite(time) ? Math.max(0, Math.ceil((time - Date.now()) / 1000)) : null
}

function defaultStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The request payload or filter parameters are invalid.'
    case 401:
      return 'Your session has expired or is not authenticated. Please sign in again.'
    case 403:
      return 'You do not have permission to access or modify this record.'
    case 404:
      return 'The requested academic record was not found.'
    case 409:
      return 'The request conflicts with an existing record or academic rule.'
    case 429:
      return 'Too many requests. Please wait before trying again.'
    default:
      return status >= 500
        ? 'An unexpected server error occurred. Please try again later.'
        : 'The API request could not be completed.'
  }
}

function defaultCodeForStatus(status: number): string {
  if (status === 401) return API_ERROR_CODES.GATEWAY_AUTH_ERROR
  if (status === 403) return API_ERROR_CODES.INSUFFICIENT_PRIVILEGE
  if (status === 404) return API_ERROR_CODES.NOT_FOUND
  if (status === 429) return API_ERROR_CODES.RATE_LIMITED
  return API_ERROR_CODES.UNKNOWN_API_ERROR
}

/**
 * Normalizes any documented OpenAPI error body (`Error` or `SupabaseGatewayAuthError`),
 * raw `Error`, or empty HTTP failure response into a predictable `NormalizedApiError`.
 */
export function normalizeApiError(
  errorPayload: unknown,
  response?: Response | null,
): NormalizedApiError {
  if (errorPayload instanceof ApiClientError) {
    return {
      status: errorPayload.status,
      code: errorPayload.code,
      message: errorPayload.message,
      details: errorPayload.details,
      hint: errorPayload.hint,
      retryAfterSeconds: errorPayload.retryAfterSeconds,
      isAuthError: errorPayload.isAuthError,
      isForbidden: errorPayload.isForbidden,
      isNotFound: errorPayload.isNotFound,
      isConflict: errorPayload.isConflict,
      isRateLimited: errorPayload.isRateLimited,
      isNetworkError: errorPayload.isNetworkError,
    }
  }

  if (!response && errorPayload instanceof Error) {
    return {
      status: 0,
      code: API_ERROR_CODES.NETWORK_ERROR,
      message: errorPayload.message || 'Network request failed.',
      details: null,
      hint: 'Check your network connection and try again.',
      retryAfterSeconds: null,
      isAuthError: false,
      isForbidden: false,
      isNotFound: false,
      isConflict: false,
      isRateLimited: false,
      isNetworkError: true,
    }
  }

  const status = response?.status ?? 500
  const retryAfterSeconds = parseRetryAfterSeconds(response)

  let code = defaultCodeForStatus(status)
  let message = defaultStatusMessage(status)
  let details: string | null = null
  let hint: string | null = null

  if (isRecord(errorPayload)) {
    const rawCode = errorPayload.code
    if (typeof rawCode === 'string' && rawCode.trim().length > 0) {
      code = rawCode.trim()
    } else if (typeof rawCode === 'number') {
      code = String(rawCode)
    } else if (status === 401 && nonEmptyString(errorPayload.error)) {
      code = nonEmptyString(errorPayload.error) ?? code
    }

    const extractedMessage =
      nonEmptyString(errorPayload.message) ??
      nonEmptyString(errorPayload.error_description) ??
      nonEmptyString(errorPayload.error)

    if (extractedMessage) {
      message = extractedMessage
    }

    details =
      nonEmptyString(errorPayload.details) ??
      (nonEmptyString(errorPayload.message) &&
      nonEmptyString(errorPayload.error_description)
        ? nonEmptyString(errorPayload.error_description)
        : null)

    hint = nonEmptyString(errorPayload.hint)
  } else if (typeof errorPayload === 'string' && errorPayload.trim().length > 0) {
    message = errorPayload.trim()
  }

  return {
    status,
    code,
    message,
    details,
    hint,
    retryAfterSeconds,
    isAuthError:
      status === 401 ||
      code === API_ERROR_CODES.AUTH_SESSION_REQUIRED ||
      code === API_ERROR_CODES.JWT_EXPIRED_OR_INVALID,
    isForbidden: status === 403 || code === API_ERROR_CODES.INSUFFICIENT_PRIVILEGE,
    isNotFound: status === 404 || code === API_ERROR_CODES.NOT_FOUND,
    isConflict: status === 409,
    isRateLimited: status === 429 || code === API_ERROR_CODES.RATE_LIMITED,
    isNetworkError: status === 0 || code === API_ERROR_CODES.NETWORK_ERROR,
  }
}

export function isApiClientError(value: unknown): value is ApiClientError {
  return value instanceof ApiClientError
}

export function hasApiErrorCode(
  error: unknown,
  expectedCode: string,
): boolean {
  if (error instanceof ApiClientError) {
    return error.code === expectedCode
  }
  if (isRecord(error) && typeof error.code === 'string') {
    return error.code === expectedCode
  }
  return false
}

/**
 * Unwraps an `openapi-fetch` `{ data, error, response }` result tuple:
 * returns `data` on HTTP 2xx (including `undefined as T` for `204 No Content`),
 * or throws a normalized `ApiClientError` for TanStack Query / async callers.
 */
export function unwrapApiResult<TData>(result: {
  data?: TData
  error?: unknown
  response: Response
}): TData {
  if (result.error !== undefined || !result.response.ok) {
    throw new ApiClientError(
      normalizeApiError(result.error, result.response),
      { cause: result.error },
    )
  }
  return result.data as TData
}
