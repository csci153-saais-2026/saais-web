import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSupabaseBrowserClient,
  getSupabaseClient,
  resetSupabaseClientForTests,
  resolveSaaisEnvConfig,
} from '@/lib/supabase/client'
import {
  API_ERROR_CODES,
  ApiClientError,
  createSaaisApiClient,
  getMockSessionToken,
  hasApiErrorCode,
  isApiClientError,
  isPublicContractPath,
  normalizeApiError,
  parseContentRange,
  parseRetryAfterSeconds,
  postgrestFilter,
  resolveCurrentAccessToken,
  setAccessTokenResolver,
  setMockSessionToken,
  unwrapApiResult,
  type ApiSchema,
  type UnauthorizedEventContext,
} from './index'

const SAMPLE_UUID_1 = '11111111-1111-4111-8111-111111111111'
const SAMPLE_UUID_2 = '22222222-2222-4222-8222-222222222222'
const BASE_URL = 'https://saais-test.supabase.co'
const TEST_API_KEY = 'sb_publishable_test_key_123'

afterEach(() => {
  setMockSessionToken(null)
  setAccessTokenResolver(null)
  resetSupabaseClientForTests()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('resolveSaaisEnvConfig & Supabase client setup', () => {
  it('defaults to mock mode with fallback publishable key when Supabase env vars are absent', () => {
    const config = resolveSaaisEnvConfig({})
    expect(config.mode).toBe('mock')
    expect(config.supabaseUrl).toBeNull()
    expect(config.supabaseKey).toBe('saais-mock-publishable-key')
    expect(config.apiBaseUrl).toBeTruthy()
  })

  it('auto-detects supabase mode and prefers VITE_SUPABASE_PUBLISHABLE_KEY over VITE_SUPABASE_ANON_KEY', () => {
    const config = resolveSaaisEnvConfig({
      VITE_SUPABASE_URL: ' https://proj.supabase.co ',
      VITE_SUPABASE_PUBLISHABLE_KEY: ' sb_pub_preferred ',
      VITE_SUPABASE_ANON_KEY: 'legacy_anon',
      VITE_SITE_URL: 'http://localhost:5173',
    })

    expect(config.mode).toBe('supabase')
    expect(config.supabaseUrl).toBe('https://proj.supabase.co')
    expect(config.apiBaseUrl).toBe('https://proj.supabase.co')
    expect(config.supabaseKey).toBe('sb_pub_preferred')
    expect(config.siteUrl).toBe('http://localhost:5173')
  })

  it('falls back to VITE_SUPABASE_ANON_KEY and respects VITE_API_BASE_URL and explicit VITE_API_MODE=mock', () => {
    const config = resolveSaaisEnvConfig({
      VITE_API_MODE: 'mock',
      VITE_API_BASE_URL: 'http://127.0.0.1:4010',
      VITE_SUPABASE_URL: 'https://proj.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'legacy_anon_key',
    })

    expect(config.mode).toBe('mock')
    expect(config.apiBaseUrl).toBe('http://127.0.0.1:4010')
    expect(config.supabaseKey).toBe('legacy_anon_key')
  })

  it('creates a PKCE-configured Supabase client and guards unconfigured getSupabaseClient()', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    const sdkClient = createSupabaseBrowserClient(BASE_URL, TEST_API_KEY)
    expect(sdkClient.auth).toBeDefined()
    expect(() => getSupabaseClient()).toThrow(/Supabase client is unavailable/i)
  })
})

describe('auth token resolution (mock mode & custom resolver)', () => {
  it('honors an explicit Supabase mode when the default mode is mock', async () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    vi.stubEnv('VITE_SUPABASE_URL', BASE_URL)
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', TEST_API_KEY)
    const sdk = getSupabaseClient('supabase')
    vi.spyOn(sdk.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null })
    expect(await resolveCurrentAccessToken('supabase')).toBeNull()
    expect(sdk.auth.getSession).toHaveBeenCalled()
    expect(resolveSaaisEnvConfig({ VITE_API_MODE: 'mock', VITE_SUPABASE_URL: BASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: TEST_API_KEY }).apiBaseUrl).not.toBe(BASE_URL)
  })

  it('stores, trims, and clears mock session tokens cleanly', async () => {
    expect(getMockSessionToken()).toBeNull()
    expect(await resolveCurrentAccessToken('mock')).toBeNull()

    setMockSessionToken('  mock-jwt:adviser:001  ')
    expect(getMockSessionToken()).toBe('mock-jwt:adviser:001')
    expect(await resolveCurrentAccessToken('mock')).toBe('mock-jwt:adviser:001')

    setMockSessionToken('   ')
    expect(getMockSessionToken()).toBeNull()
  })

  it('supports custom async access token resolvers', async () => {
    setAccessTokenResolver(async () => '  dynamic-token-abc  ')
    expect(await resolveCurrentAccessToken('mock')).toBe('dynamic-token-abc')

    setAccessTokenResolver(() => '   ')
    expect(await resolveCurrentAccessToken('mock')).toBeNull()
  })
})

describe('createSaaisApiClient auth headers & pre-login exception', () => {
  it('notifies only protected requests when the API key is missing', async () => {
    const events: UnauthorizedEventContext[] = []
    const client = createSaaisApiClient({ baseUrl: BASE_URL, mode: 'supabase', apiKey: '', onUnauthorized: event => events.push(event) })
    await client.GET('/rest/v1/course')
    await client.POST('/functions/v1/auth/preview-invite', { body: { token: 'test-token' } })
    expect(events).toHaveLength(1)
    expect(events[0].error.code).toBe(API_ERROR_CODES.MISSING_API_KEY)
  })

  it('attaches apikey and a fresh per-request Bearer token on protected routes', async () => {
    const seenRequests: Request[] = []
    let currentToken: string | null = 'jwt-initial'

    const mockFetch = vi.fn(async (request: Request) => {
      seenRequests.push(request)
      const courses: ApiSchema<'Course'>[] = [
        {
          id: SAMPLE_UUID_1,
          department_id: SAMPLE_UUID_2,
          code: 'CSCI 153',
          title: 'Software Engineering',
          category: 'major',
          units: 3,
          is_elective: false,
          status: 'active',
          repeatable_type: 'none',
        },
      ]
      return new Response(JSON.stringify(courses), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Range': '0-0/1',
        },
      })
    })

    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      getAccessToken: () => currentToken,
      fetch: mockFetch,
    })

    const first = await client.GET('/rest/v1/course', {
      params: {
        query: {
          department_id: postgrestFilter.eq(SAMPLE_UUID_2),
          status: postgrestFilter.eq('active'),
          limit: 20,
        },
      },
    })
    const rows = unwrapApiResult(first)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.code).toBe('CSCI 153')

    // Rotate session token and verify next request uses refreshed JWT (never cached stale token)
    currentToken = 'jwt-refreshed'
    await client.GET('/rest/v1/course')

    expect(seenRequests).toHaveLength(2)
    expect(seenRequests[0]?.headers.get('apikey')).toBe(TEST_API_KEY)
    expect(seenRequests[0]?.headers.get('Authorization')).toBe(
      'Bearer jwt-initial',
    )
    expect(seenRequests[1]?.headers.get('Authorization')).toBe(
      'Bearer jwt-refreshed',
    )
  })

  it('sends apikey WITHOUT Authorization on pre-login /functions/v1/auth/{preview-invite,verify-invite,decline-invite}', async () => {
    expect(isPublicContractPath('/functions/v1/auth/preview-invite')).toBe(true)
    expect(isPublicContractPath('/functions/v1/auth/verify-invite')).toBe(true)
    expect(isPublicContractPath('/functions/v1/auth/decline-invite')).toBe(true)
    expect(isPublicContractPath('/functions/v1/auth/invite')).toBe(false)

    const capturedRequests: Request[] = []
    const mockFetch = vi.fn(async (request: Request) => {
      capturedRequests.push(request)
      if (request.url.endsWith('/functions/v1/auth/preview-invite')) {
        return new Response(
          JSON.stringify({
            valid: true,
            status: 'pending',
            email: 'student@vsu.edu.ph',
            full_name: 'Juan Dela Cruz',
            role: 'student',
            department_name: 'Department of Computer Science and Technology',
            faculty_name: 'Faculty of Computing',
            program_name: 'BS in Computer Science',
            expires_at: '2026-12-31T23:59:59Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (request.url.endsWith('/functions/v1/auth/decline-invite')) {
        return new Response(
          JSON.stringify({
            success: true,
            invitation_status: 'declined',
            message: 'Invitation declined.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account successfully activated.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      getAccessToken: () => 'stale-token-that-must-not-be-sent',
      fetch: mockFetch,
    })

    const preview = unwrapApiResult(
      await client.POST('/functions/v1/auth/preview-invite', {
        headers: { Authorization: 'Bearer should-be-stripped' },
        body: { token: 'opaque-single-use-invite-token' },
      }),
    )
    expect(preview.valid).toBe(true)
    expect(preview.status).toBe('pending')

    const verify = unwrapApiResult(
      await client.POST('/functions/v1/auth/verify-invite', {
        headers: { Authorization: 'Bearer should-be-stripped' },
        body: {
          token: 'opaque-single-use-invite-token',
          password: 'StrongPassword!2026',
        },
      }),
    )
    expect(verify.success).toBe(true)

    const decline = unwrapApiResult(
      await client.POST('/functions/v1/auth/decline-invite', {
        headers: { Authorization: 'Bearer should-be-stripped' },
        body: { token: 'opaque-single-use-invite-token' },
      }),
    )
    expect(decline.invitation_status).toBe('declined')

    expect(capturedRequests).toHaveLength(3)
    for (const req of capturedRequests) {
      expect(req.headers.get('apikey')).toBe(TEST_API_KEY)
      expect(req.headers.get('Authorization')).toBeNull()
    }
  })

  it('short-circuits protected requests with 401 AUTH_SESSION_REQUIRED when signed out', async () => {
    const mockFetch = vi.fn()
    const unauthorizedEvents: UnauthorizedEventContext[] = []

    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      getAccessToken: () => null,
      fetch: mockFetch,
      onUnauthorized: (ctx) => unauthorizedEvents.push(ctx),
    })

    const result = await client.GET('/rest/v1/profile')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.response.status).toBe(401)
    expect(unauthorizedEvents).toHaveLength(1)
    expect(unauthorizedEvents[0]?.error.code).toBe(
      API_ERROR_CODES.AUTH_SESSION_REQUIRED,
    )

    expect(() => unwrapApiResult(result)).toThrowError(ApiClientError)
    try {
      unwrapApiResult(result)
    } catch (err) {
      expect(isApiClientError(err)).toBe(true)
      expect(hasApiErrorCode(err, API_ERROR_CODES.AUTH_SESSION_REQUIRED)).toBe(
        true,
      )
      if (isApiClientError(err)) {
        expect(err.isAuthError).toBe(true)
        expect(err.status).toBe(401)
      }
    }
  })

  it('short-circuits with 401 MISSING_API_KEY when apiKey is empty', async () => {
    const mockFetch = vi.fn()
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: null,
      getAccessToken: () => 'valid-jwt',
      fetch: mockFetch,
    })

    const result = await client.GET('/rest/v1/faculty')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(() => unwrapApiResult(result)).toThrow(/publishable API key/i)
    expect(hasApiErrorCode(result.error, API_ERROR_CODES.MISSING_API_KEY)).toBe(
      true,
    )
  })
})

describe('error handling, gateway 401s, rate limits, 204s, and network failures', () => {
  it('normalizes domain 409 ENROLLMENT_CONFIRMATION_REQUIRED without replaying mutations', async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          code: API_ERROR_CODES.ENROLLMENT_CONFIRMATION_REQUIRED,
          message:
            'Confirm new course enrollment before recording a midterm grade.',
          details: 'No existing attempt found for CSCI 153 in 1st Sem 2026-2027.',
          hint: 'Re-submit with confirmed_enrollment=true.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      getAccessToken: () => 'adviser-jwt',
      fetch: mockFetch,
    })

    const result = await client.POST(
      '/functions/v1/students/{student_id}/record-grades',
      {
        params: { path: { student_id: SAMPLE_UUID_1 } },
        body: {
          school_term_id: SAMPLE_UUID_2,
          course_offering_id: SAMPLE_UUID_1,
          midterm_grade: 1.75,
          confirmed_enrollment: false,
          continue_with_prerequisite_override: false,
        },
      },
    )

    // Must never auto-replay failed mutations
    expect(mockFetch).toHaveBeenCalledTimes(1)

    try {
      unwrapApiResult(result)
      expect.fail('Expected unwrapApiResult to throw ApiClientError')
    } catch (err) {
      expect(isApiClientError(err)).toBe(true)
      if (isApiClientError(err)) {
        expect(err.status).toBe(409)
        expect(err.isConflict).toBe(true)
        expect(err.code).toBe(API_ERROR_CODES.ENROLLMENT_CONFIRMATION_REQUIRED)
        expect(err.details).toContain('CSCI 153')
        expect(err.hint).toContain('confirmed_enrollment=true')
        // Idempotent re-normalization check
        expect(normalizeApiError(err)).toEqual({
          status: 409,
          code: API_ERROR_CODES.ENROLLMENT_CONFIRMATION_REQUIRED,
          message:
            'Confirm new course enrollment before recording a midterm grade.',
          details: 'No existing attempt found for CSCI 153 in 1st Sem 2026-2027.',
          hint: 'Re-submit with confirmed_enrollment=true.',
          retryAfterSeconds: null,
          isAuthError: false,
          isForbidden: false,
          isNotFound: false,
          isConflict: true,
          isRateLimited: false,
          isNetworkError: false,
        })
      }
    }
  })

  it('normalizes SupabaseGatewayAuthError on 401 and invokes onUnauthorized', async () => {
    const unauthorizedEvents: UnauthorizedEventContext[] = []
    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: 'invalid_token',
          error_description: 'JWT signature verification failed at gateway',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      getAccessToken: () => 'expired-jwt',
      fetch: mockFetch,
      onUnauthorized: (ctx) => unauthorizedEvents.push(ctx),
    })

    const result = await client.GET('/functions/v1/reports/adviser-dashboard')
    expect(unauthorizedEvents).toHaveLength(1)
    expect(unauthorizedEvents[0]?.schemaPath).toBe(
      '/functions/v1/reports/adviser-dashboard',
    )
    expect(unauthorizedEvents[0]?.error.code).toBe('invalid_token')
    expect(unauthorizedEvents[0]?.error.message).toBe(
      'JWT signature verification failed at gateway',
    )

    expect(() => unwrapApiResult(result)).toThrowError(ApiClientError)
  })

  it('parses Retry-After header on 429 rate-limited responses', async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          details: null,
          hint: null,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '45',
          },
        },
      )
    })

    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      getAccessToken: () => 'student-jwt',
      fetch: mockFetch,
    })

    const result = await client.GET('/rest/v1/notification')
    expect(parseRetryAfterSeconds(result.response)).toBe(45)

    try {
      unwrapApiResult(result)
    } catch (err) {
      expect(isApiClientError(err)).toBe(true)
      if (isApiClientError(err)) {
        expect(err.isRateLimited).toBe(true)
        expect(err.retryAfterSeconds).toBe(45)
      }
    }
  })

  it('handles 204 No Content deletes and converts raw network errors to ApiClientError', async () => {
    const deleteClient = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      getAccessToken: () => 'adviser-jwt',
      fetch: vi.fn(async () => new Response(null, { status: 204 })),
    })

    const delResult = await deleteClient.DELETE(
      '/functions/v1/students/{student_id}/attempts/{attempt_id}',
      {
        params: {
          path: { student_id: SAMPLE_UUID_1, attempt_id: SAMPLE_UUID_2 },
        },
      },
    )
    expect(unwrapApiResult(delResult)).toBeUndefined()

    const failingClient = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      getAccessToken: () => 'adviser-jwt',
      fetch: vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    })

    await expect(failingClient.GET('/rest/v1/school_term')).rejects.toSatisfy(
      (err: unknown) =>
        isApiClientError(err) &&
        err.isNetworkError &&
        err.code === API_ERROR_CODES.NETWORK_ERROR,
    )
  })

  it('handles non-JSON text errors and fallback status messages gracefully', () => {
    const forbidden = normalizeApiError(
      '',
      new Response('', { status: 403 }),
    )
    expect(forbidden.isForbidden).toBe(true)
    expect(forbidden.code).toBe(API_ERROR_CODES.INSUFFICIENT_PRIVILEGE)

    const notFound = normalizeApiError(
      'Gateway upstream timeout text',
      new Response('', { status: 404 }),
    )
    expect(notFound.isNotFound).toBe(true)
    expect(notFound.message).toBe('Gateway upstream timeout text')

    const numericCode = normalizeApiError(
      {
        code: 401,
        message: 'Unauthorized',
        error_description: 'Missing sub claim',
      },
      new Response('', { status: 401 }),
    )
    expect(numericCode.code).toBe('401')
    expect(numericCode.details).toBe('Missing sub claim')
    expect(hasApiErrorCode(null, 'ANY')).toBe(false)
  })
})

describe('PostgREST filter & Content-Range helpers', () => {
  it('rejects syntax injection and malformed ranges', () => {
    expect(() => postgrestFilter.inList(['ok,malicious'])).toThrow()
    expect(() => postgrestFilter.ilike('x),status.eq.admin')).toThrow()
    expect(() => postgrestFilter.like('x.y')).toThrow()
    expect(() => postgrestFilter.createdAtBetween('2026-01-02', '2026-01-01')).toThrow()
    expect(parseContentRange('10-2/20')).toBeNull()
    expect(parseContentRange('0-999999999999999999999/*')).toBeNull()
  })

  it('accepts zero and HTTP-date Retry-After values', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-11T00:00:00Z'))
    try {
      expect(parseRetryAfterSeconds({ headers: new Headers({ 'Retry-After': '0' }) })).toBe(0)
      expect(parseRetryAfterSeconds({ headers: new Headers({ 'Retry-After': 'Wed, 11 Nov 2026 00:00:30 GMT' }) })).toBe(30)
    } finally { vi.useRealTimers() }
  })

  it('builds operator-prefixed filters and enforces the 50-UUID cap on inList', () => {
    expect(postgrestFilter.eq(SAMPLE_UUID_1)).toBe(`eq.${SAMPLE_UUID_1}`)
    expect(postgrestFilter.neq('archived')).toBe('neq.archived')
    expect(postgrestFilter.inList([SAMPLE_UUID_1, SAMPLE_UUID_2])).toBe(
      `in.(${SAMPLE_UUID_1},${SAMPLE_UUID_2})`,
    )
    expect(postgrestFilter.isNull()).toBe('is.null')
    expect(postgrestFilter.notIsNull()).toBe('not.is.null')
    expect(postgrestFilter.gte('2026-01-01T00:00:00Z')).toBe(
      'gte.2026-01-01T00:00:00Z',
    )
    expect(postgrestFilter.lte('2026-12-31T23:59:59Z')).toBe(
      'lte.2026-12-31T23:59:59Z',
    )
    expect(postgrestFilter.gt('2026-01-01')).toBe('gt.2026-01-01')
    expect(postgrestFilter.lt('2026-12-31')).toBe('lt.2026-12-31')
    expect(postgrestFilter.ilike('*CSCI*')).toBe('ilike.*CSCI*')
    expect(postgrestFilter.like('CSCI%')).toBe('like.CSCI%')
    expect(
      postgrestFilter.createdAtBetween(
        '2026-01-01T00:00:00Z',
        '2026-01-31T23:59:59Z',
      ),
    ).toBe(
      '(created_at.gte.2026-01-01T00:00:00Z,created_at.lte.2026-01-31T23:59:59Z)',
    )

    expect(() => postgrestFilter.inList([])).toThrow(RangeError)
    expect(() =>
      postgrestFilter.inList(Array.from({ length: 51 }, () => SAMPLE_UUID_1)),
    ).toThrow(/maximum of 50/i)
  })

  it('parses PostgREST Content-Range headers accurately', () => {
    expect(parseContentRange('0-19/142')).toEqual({
      start: 0,
      end: 19,
      total: 142,
    })
    expect(parseContentRange('20-39/*')).toEqual({
      start: 20,
      end: 39,
      total: null,
    })
    expect(parseContentRange('*/0')).toEqual({
      start: null,
      end: null,
      total: 0,
    })
    expect(parseContentRange(null)).toBeNull()
    expect(parseContentRange('invalid-range')).toBeNull()
  })
})
