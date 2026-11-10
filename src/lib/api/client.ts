import createClient, {
  type Client,
  type ClientOptions,
  type Middleware,
} from 'openapi-fetch'
import {
  resolveSaaisEnvConfig,
  type ApiRuntimeMode,
} from '@/lib/supabase/client'
import {
  resolveCurrentAccessToken,
  type AccessTokenResolver,
} from './auth-token'
import {
  API_ERROR_CODES,
  ApiClientError,
  normalizeApiError,
  type NormalizedApiError,
} from './errors'
import type { paths } from './types'

/**
 * Contract paths that require `apikey` only and MUST NOT send a user bearer JWT
 * (`contract/openapi.yaml` & `contract/SUPABASE-AUTH.md`).
 */
export const PUBLIC_CONTRACT_PATHS: ReadonlySet<string> = new Set([
  '/functions/v1/auth/preview-invite',
  '/functions/v1/auth/verify-invite',
  '/functions/v1/auth/decline-invite',
])

export interface UnauthorizedEventContext {
  readonly schemaPath: string
  readonly method: string
  readonly status: 401
  readonly error: NormalizedApiError
}

export interface SaaisApiClientOptions {
  /** Override base URL (defaults to `VITE_API_BASE_URL` or `VITE_SUPABASE_URL`). */
  readonly baseUrl?: string
  /** Override Supabase publishable / anon `apikey` header value. */
  readonly apiKey?: string | null
  /** Explicit runtime mode (`'mock'` or `'supabase'`). */
  readonly mode?: ApiRuntimeMode
  /** Custom per-request user JWT resolver (defaults to `resolveCurrentAccessToken`). */
  readonly getAccessToken?: AccessTokenResolver
  /** Optional custom `fetch` implementation (for unit tests or custom environments). */
  readonly fetch?: ClientOptions['fetch']
  /** Optional listener invoked whenever a protected request fails with HTTP `401`. */
  readonly onUnauthorized?: (context: UnauthorizedEventContext) => void
}

export type SaaisApiClient = Client<paths, 'application/json'>

function jsonErrorResponse(
  status: number,
  payload: {
    code: string
    message: string
    details: string | null
    hint: string | null
  },
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function isPublicContractPath(schemaPath: string): boolean {
  return PUBLIC_CONTRACT_PATHS.has(schemaPath)
}

/**
 * Creates a strongly typed SAAIS OpenAPI client backed by `contract/generated/schema.d.ts`.
 *
 * Security & contract guarantees:
 * - Injects `apikey` on every request.
 * - Resolves the fresh user `Authorization: Bearer <access_token>` per request on all protected routes.
 * - Strips `Authorization` on pre-login `/functions/v1/auth/{preview-invite,verify-invite,decline-invite}`.
 * - Never auto-replays failed academic mutations (`POST`, `PUT`, `PATCH`, `DELETE`).
 * - Wraps raw network failures into `ApiClientError` (`code: 'NETWORK_ERROR'`).
 */
export function createSaaisApiClient(
  options: SaaisApiClientOptions = {},
): SaaisApiClient {
  const envConfig = resolveSaaisEnvConfig()
  const baseUrl = options.baseUrl ?? envConfig.apiBaseUrl
  const mode = options.mode ?? envConfig.mode
  const configuredApiKey =
    options.apiKey !== undefined ? options.apiKey : envConfig.supabaseKey
  const tokenResolver: AccessTokenResolver =
    options.getAccessToken ?? (() => resolveCurrentAccessToken(mode))

  const client = createClient<paths>({
    baseUrl,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  })

  const authAndErrorMiddleware: Middleware = {
    async onRequest({ request, schemaPath }) {
      const existingApiKey = request.headers.get('apikey')?.trim()
      const effectiveApiKey = existingApiKey || configuredApiKey?.trim() || ''

      if (!effectiveApiKey) {
        return jsonErrorResponse(401, {
          code: API_ERROR_CODES.MISSING_API_KEY,
          message:
            'Supabase project publishable API key is not configured for API requests.',
          details: null,
          hint: 'Configure VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY), or run with VITE_API_MODE=mock.',
        })
      }

      request.headers.set('apikey', effectiveApiKey)

      // Pre-login invitation verification uses `apikey` + body token only.
      if (isPublicContractPath(schemaPath)) {
        request.headers.delete('Authorization')
        return request
      }

      if (!request.headers.has('Authorization')) {
        const accessToken = await tokenResolver()
        const trimmedToken = accessToken?.trim() ?? ''

        if (!trimmedToken) {
          const response = jsonErrorResponse(401, {
            code: API_ERROR_CODES.AUTH_SESSION_REQUIRED,
            message:
              'An active authenticated session is required to perform this request.',
            details: null,
            hint: 'Sign in again to obtain a valid user access token.',
          })

          if (options.onUnauthorized) {
            const payload = {
              code: API_ERROR_CODES.AUTH_SESSION_REQUIRED,
              message:
                'An active authenticated session is required to perform this request.',
              details: null,
              hint: 'Sign in again to obtain a valid user access token.',
            }
            options.onUnauthorized({
              schemaPath,
              method: request.method,
              status: 401,
              error: normalizeApiError(payload, response),
            })
          }

          return response
        }

        request.headers.set('Authorization', `Bearer ${trimmedToken}`)
      }

      return request
    },

    async onResponse({ request, response, schemaPath }) {
      if (
        response.status === 401 &&
        options.onUnauthorized &&
        !isPublicContractPath(schemaPath)
      ) {
        let parsedBody: unknown
        try {
          parsedBody = await response.clone().json()
        } catch {
          parsedBody = undefined
        }
        options.onUnauthorized({
          schemaPath,
          method: request.method,
          status: 401,
          error: normalizeApiError(parsedBody, response),
        })
      }
      return response
    },

    onError({ error }) {
      if (error instanceof ApiClientError) {
        return error
      }
      return new ApiClientError(normalizeApiError(error, null), {
        cause: error,
      })
    },
  }

  client.use(authAndErrorMiddleware)
  return client
}

/**
 * Default application-wide typed API client singleton.
 * Uses `VITE_API_MODE` (`mock` vs `supabase`) and resolves fresh auth tokens per request.
 */
export const apiClient: SaaisApiClient = createSaaisApiClient()
