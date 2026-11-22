# PR #122 review readiness

## Scope

This branch follows the approved contract/mock corrections from PR #95 and
addresses the frontend review findings for route fallbacks, safe post-sign-in
destinations, cache isolation, role-scoped mock data, dean report paging,
curriculum cloning, validation, and workflow action pinning.

## Milestone #4 evidence

- Auth shell and guards: protected-route, password-return, OAuth-return, and
  unknown-route tests cover the expected portal-entry paths.
- Student, adviser, department staff, department head, dean, and administrator
  mock workflows are covered by the role prototype Playwright suite.
- Admin and staff provisioning, curriculum, course-offering, grade, and
  adviser-assignment paths have route-level unit or integration coverage.

## Verification run locally

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test:coverage`
- `npm run test:prototype:e2e`
- `npm run build`
- `npm run contract:lint`
- `npm run contract:security`
- `npm run contract:spectral`
- `npm run contract:check`

## Known integration limits

- MSW implements mock authorization scope. The deployed API and Supabase RLS
  must independently enforce the same policy before production use.
- The adviser AI assistant remains mock-preview functionality and stays
  disabled outside mock mode. This branch does not claim a real AI/backend
  integration.
- The live Vercel direct-link and refresh check was intentionally deferred.
- The GitHub Advanced Security thread must be resolved after GitHub Actions has
  run on this branch. The old dynamic-RegExp thread should remain resolved.

## Suggested PR description note

State that this is a frontend integration branch which incorporates the
approved contract/mock behavior from PR #95; it does not replace backend RLS
or the separate production AI integration work.
