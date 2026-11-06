# SAAIS Typed Frontend API Client (`src/lib/api`)

Strongly typed HTTP client for the Student Academic Advising Information System (SAAIS), generated directly from [`contract/openapi.yaml`](../../../contract/openapi.yaml) via `openapi-typescript` and `openapi-fetch`.

All application reads (`/rest/v1/*` PostgREST projections) and transactional writes (`/functions/v1/*` Edge Functions) MUST flow through this client so the frontend stays 100% aligned with the frozen OpenAPI 3.1 contract in both **Mock Mode** (MSW / Prism) and **Supabase Production Mode**.

---

## 1. Regenerating Contract Types

**Never hand-edit [`contract/generated/schema.d.ts`](../../../contract/generated/schema.d.ts).** Whenever [`contract/openapi.yaml`](../../../contract/openapi.yaml) changes, run:

```bash
npm run contract:lint      # Validate OpenAPI 3.1 syntax & rules with Redocly
npm run contract:security  # Run contract security & role-boundary assertions
npm run contract:gen       # Regenerate contract/generated/schema.d.ts
npm run contract:check     # Verify generated types have zero uncommitted drift
npm run contract:docs      # Rebuild static Redoc HTML at docs/openapi/index.html
```

---

## 2. Environment Configuration & Seamless Mock ↔ Supabase Switch

Configure `.env.local` (see [`.env.example`](../../../.env.example)):

```env
# "mock" uses MSW/Prism + in-memory mock session tokens;
# "supabase" uses live Supabase Auth PKCE sessions + PostgREST/Edge Functions.
VITE_API_MODE=mock

# Required when VITE_API_MODE=supabase:
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
# Legacy alias also supported:
# VITE_SUPABASE_ANON_KEY=<anon-key>

# Optional override when pointing mock mode at a local Prism server (e.g. http://127.0.0.1:4010):
# VITE_API_BASE_URL=http://127.0.0.1:4010
```

- **Protected endpoints** automatically receive both `apikey` and a fresh per-request `Authorization: Bearer <access_token>` resolved from `supabase.auth.getSession()` (in `supabase` mode) or `getMockSessionToken()` (in `mock` mode).
- **Pre-login invitation verification** (`POST /functions/v1/auth/verify-invite`) automatically sends `apikey` **without** an `Authorization` header, matching [`contract/SUPABASE-AUTH.md`](../../../contract/SUPABASE-AUTH.md).
- **No automatic write replays**: Failed academic mutations (`POST`, `PUT`, `PATCH`, `DELETE`) are never automatically retried.

### Simulating Login, Role Switching, and Logout in Mock Mode

```ts
import { setMockSessionToken } from '@/lib/api'

// On mock login / dev role switch:
setMockSessionToken('mock-jwt:adviser:adv-uuid-001')

// On mock logout:
setMockSessionToken(null)
```

---

## 3. Usage Examples

### A. Reading PostgREST Projections with TanStack Query

```ts
import { useQuery } from '@tanstack/react-query'
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from '@/lib/api'

export type Course = ApiSchema<'Course'>

export function useActiveCourses(departmentId: string) {
  return useQuery({
    queryKey: ['courses', departmentId],
    queryFn: async () =>
      unwrapApiResult(
        await apiClient.GET('/rest/v1/course', {
          params: {
            query: {
              department_id: postgrestFilter.eq(departmentId),
              status: postgrestFilter.eq('active'),
              order: 'code.asc',
              limit: 100,
            },
          },
        }),
      ),
  })
}
```

### B. Calling Transactional Edge Functions & Handling Domain Conflicts

Use `unwrapApiResult(...)` inside `useMutation`, or inspect `{ data, error, response }` directly when branching on domain status codes such as `409 ENROLLMENT_CONFIRMATION_REQUIRED`:

```ts
import {
  API_ERROR_CODES,
  apiClient,
  hasApiErrorCode,
  isApiClientError,
  unwrapApiResult,
} from '@/lib/api'

export async function recordStudentGrade(
  studentId: string,
  payload: {
    school_term_id: string
    course_offering_id: string
    midterm_grade?: number | null
    confirmed_enrollment: boolean
    continue_with_prerequisite_override: boolean
  },
) {
  try {
    return unwrapApiResult(
      await apiClient.POST('/functions/v1/students/{student_id}/record-grades', {
        params: { path: { student_id: studentId } },
        body: payload,
      }),
    )
  } catch (err) {
    if (
      isApiClientError(err) &&
      hasApiErrorCode(err, API_ERROR_CODES.ENROLLMENT_CONFIRMATION_REQUIRED)
    ) {
      // Prompt adviser to confirm new enrollment before re-submitting with confirmed_enrollment: true
    }
    throw err
  }
}
```

### C. Parsing Pagination Totals (`Content-Range`)

```ts
import { apiClient, parseContentRange, unwrapApiResult } from '@/lib/api'

const result = await apiClient.GET('/rest/v1/audit_log_entry', {
  params: { query: { limit: 20, offset: 0 } },
})
const rows = unwrapApiResult(result)
const range = parseContentRange(result.response.headers.get('Content-Range'))
// range => { start: 0, end: 19, total: 142 }
```

---

## 4. Interactive & Static API Documentation

- **In-app routes**: Run `npm run dev` and open `/docs` (curated documentation hub) or `/docs/openapi` (interactive Redoc reference bound directly to [`contract/openapi.yaml`](../../../contract/openapi.yaml)). Outside local development (`!import.meta.env.DEV`), both routes require an authenticated SAAIS session.
- **Static Redoc bundle & CI artifact**: Run `npm run contract:docs` to generate `docs/openapi/index.html`. GitHub Actions (`.github/workflows/ci.yml`) builds and uploads `docs/openapi/index.html` as the `openapi-redoc-bundle` artifact on every CI run. See [`docs/api-documentation.md`](../../../docs/api-documentation.md) for full details.
