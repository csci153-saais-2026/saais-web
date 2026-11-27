# Staging setup and handoff

This checklist records the SAAIS test environment. Confirm owners and team access
before treating it as the team's shared staging environment. Never put passwords,
service-role keys, OAuth client secrets or database credentials in this file.

## Current test environment

This status was refreshed on November 27, 2026. Keep the hosted verification
checklist in #51 open until the remaining end-to-end and ownership checks pass.

- Supabase project: `jssexxjbgzrknlptddkg` (`SAAIS`). Its `main` branch is
  labelled Production by Supabase, but the project has been designated for
  synthetic testing by the project owner. Project owner and team access: **to be
  confirmed**.
- A Vercel deployment was observed at
  `https://saais-akvazb1lb-mhac-monteras-projects.vercel.app`. This is a
  deployment-specific URL, not a confirmed stable staging domain. Vercel project
  owner, team access and Git integration: **to be confirmed**.
- Google is enabled in Supabase Auth. The Google Cloud project, OAuth consent
  screen status, authorized test users and any verification requirements still
  need confirmation and an end-to-end sign-in test.
- On November 22, 2026, no Supabase Auth hooks were configured and Auth settings
  allowed new signups. The later Data API request hook is recorded under hosted
  verification below. The institutional account eligibility hook and its
  allowed/rejected account tests still need hosted confirmation; track ownership
  and implementation with #3, #7 and #9.

## Redirects

The frontend requests `/auth/callback` for Google sign-in and `/reset-password`
for recovery, both on the current browser origin. The following exact URLs were
added to the Supabase test project's redirect allowlist on November 22, 2026:

- `http://localhost:5173/auth/callback`
- `http://localhost:5173/reset-password`
- `https://saais-akvazb1lb-mhac-monteras-projects.vercel.app/auth/callback`
- `https://saais-akvazb1lb-mhac-monteras-projects.vercel.app/reset-password`

The Supabase Site URL was still `http://localhost:3000` when inspected. Set it
to the team's approved stable staging origin after confirming the domain. Add
that origin's two routes to the allowlist, and review deployment-specific URLs
as previews change. The Google Cloud OAuth client's authorized redirect URI is
the Supabase callback `https://jssexxjbgzrknlptddkg.supabase.co/auth/v1/callback`;
the app callback URLs above belong in Supabase's allowlist.

## Vercel and secrets

Confirm the repository and team in Vercel. For the appropriate preview/staging
environment, configure `VITE_API_MODE=supabase`, `VITE_SUPABASE_URL`, and the
public `VITE_SUPABASE_PUBLISHABLE_KEY`; see `.env.example` for optional values.
The docs API additionally uses server-side `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`. Redeploy after environment changes. Vite embeds
`VITE_` values in the browser bundle: never use a secret or service-role key
there. Configure Google client credentials in Supabase Auth and store secrets
in the team's approved secret store; confirm the store and access owners.

`vercel.json` routes SPA paths to `index.html` while preserving `/api/` paths.
After deployment, directly open and refresh a client-side route and verify the
docs endpoint independently.

## Hosted backend verification

Observed on November 27, 2026:

- The hosted `authenticator` role reports
  `pgrst.db_pre_request = public.saais_check_data_api_request`.
- Supabase CLI listed `data-api` as ACTIVE version 2, and `mail-delivery` and
  `photo-cleanup` as ACTIVE version 3.
- The hosted secret list contained `SAAIS_MAIL_WORKER_SECRET`,
  `SAAIS_RESEND_API_KEY`, `SAAIS_MAIL_FROM`, `SAAIS_SITE_URL`, and
  `SAAIS_MAIL_ENVIRONMENT`. Secret values are not recorded here. The project is
  configured for production mail; no recipient allowlist is configured.
- Periodic worker execution is not verified. The hosted database did not expose
  `cron.job`, and the checked function logs showed no invocation during the
  preceding 24 hours. Configure a scheduler and record a successful run in #51.
- A successful signed-in collection read through the deployed gateway has not
  been confirmed. The latest observed Vercel login page displayed the gateway
  collection-read warning; verify a successful read through the integrated
  client, its default page size of 20, and a denied direct collection request
  before marking this complete.
- Hosted creation and behavior of the Google identity and student-photo storage
  triggers still need explicit confirmation in #51.

## Acceptance checks still required

1. Record the Supabase, Vercel and Google Cloud owners, team access, and any
   account-approval delays and responsible person in the team's chosen tracker.
2. Confirm the hosted Auth hooks enforce the agreed provisioned-account policy
   without breaking invitations or recovery. Do not rely on frontend role
   checks as the security boundary.
3. Verify the Google OAuth consent screen, authorized redirect URI, test-user
   access and verification requirements with the Cloud project owner; test
   allowed and rejected accounts end to end.
4. Confirm the stable staging URL, Site URL, allowlist, environment values and
   secret ownership, then redeploy and exercise sign-in and password recovery.
5. Complete the hosted backend checks in #51: verify both database triggers,
   run a signed-in collection read through `data-api` with the default page size
   of 20, confirm direct collection access is denied, and configure and observe
   scheduled worker runs.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[Vercel environment variables](https://vercel.com/docs/environment-variables).
