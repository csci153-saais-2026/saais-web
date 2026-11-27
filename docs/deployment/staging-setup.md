# Staging setup and handoff

Keep [issue #51](https://github.com/csci153-saais-2026/saais-web/issues/51)
open until the team records ownership and verifies the hosted flows below.

## Hosting and ownership

| Service | Confirmed setup | Remaining evidence |
| --- | --- | --- |
| Supabase | The active `SAAIS` project has ref `jssexxjbgzrknlptddkg`. The public Vercel site's browser bundle uses this project. | JakeNLelis confirmed ownership. Record any additional team access. |
| Vercel | GitHub deployment checks for this repo report the `mhac-monteras-projects/saais-web` project. The approved staging origin is https://saais.plenums.app. | JakeNLelis confirmed ownership. Record the deployed commit and additional team access. |
| Google Cloud | The active OAuth client points to Google Cloud project `elegant-theorem-450011-i1`. Google sign-in is enabled. | JakeNLelis has the Owner role. Record the External consent screen publishing and verification status. |
| Secrets | Supabase lists mail worker and Google Apps Script relay secret names. | Confirm the approved secret stores and access owners for staging OAuth, Auth hooks, the mail relay and scheduled jobs. |

[PR #223](https://github.com/csci153-saais-2026/saais-web/pull/223) tracks promotion
from `dev` to `staging`. The staging branch exists. The integration fixes still
need to reach `dev` before the promotion includes them.

Record any access or approval delays in issue #51 with the responsible person
and next step. JakeNLelis owns the hosted rollout and records remaining provider checks in #51.
The local Auth hook is configured in `supabase/config.toml` and
tracked under [#9](https://github.com/csci153-saais-2026/saais-web/issues/9). The
hosted access-token change is in
[#218](https://github.com/csci153-saais-2026/saais-web/pull/218). See
the hosted verification below.

## Redirects

The Supabase Site URL is `https://saais.plenums.app`. The hosted allowlist
includes `https://saais.plenums.app/auth/callback`,
`https://saais.plenums.app/reset-password`, and the local callback and recovery
routes for `http://localhost:5173`. The frontend builds browser redirects from
the current origin.

The earlier deployment-specific preview used
`https://saais-akvazb1lb-mhac-monteras-projects.vercel.app`. The allowlist
previously included its callback and recovery routes and the localhost routes
above. The approved staging origin entries were verified on November 28.

The Google Cloud OAuth web client's authorized redirect URI is
`https://jssexxjbgzrknlptddkg.supabase.co/auth/v1/callback`. Configure its
External consent screen and add the authorized QA accounts if the app is in
Testing. Record the consent and verification status without publishing client
secrets or QA credentials.

## Vercel and secrets

Set `VITE_API_MODE=supabase`, `VITE_SUPABASE_URL`, and
`VITE_SUPABASE_PUBLISHABLE_KEY` for the staging deployment. The docs API uses
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` server-side. Redeploy after changing
the environment. Use the public project key for browser configuration.

Keep OAuth secrets in Supabase Auth and worker/signing credentials in the
approved Edge Function and scheduler secret stores. The
[Google Apps Script mailer setup](../backend/google-apps-script-mailer.md)
documents the mail relay. Use team-approved institutional test recipients for
invitation and scheduled delivery smoke tests.

`vercel.json` serves `index.html` on SPA deep links and preserves API routes.
Verify a direct load and refresh while signed in on the chosen staging domain.

## Hosted verification on November 28, 2026

- Applied the five pending integration migrations from `3eae1b6` and deployed
  the Auth hook, Data API and related functions. Both signed HTTP Auth hooks are
  enabled. A synthetic password login recorded one `sign_in_succeeded` entry,
  and a token refresh left that count at one. The fixture was disabled after the
  check. JakeNLelis also signed in with Google and reloaded a dashboard. The
  hosted audit contained one event for that session.
- Migration `20261126002300` is recorded as applied. PostgREST loads
  `pgrst.db_pre_request=public.saais_check_data_api_request` for
  `authenticator`. A request with a synthetic session and the deployed
  publishable key returned 20 course rows by default and 21 with an explicit
  limit. The matching direct collection request returned `403 PT403`.
  `data-api` is active with JWT verification enabled.
- The hosted `auth.identities` trigger activated a synthetic invited profile
  on the first verified Google identity insert. It invalidated the password
  token, removed the queued email and wrote one acceptance audit event. The
  test transaction rolled back. First-time activation through the Google
  browser flow still needs an unused institutional mailbox.
- A synthetic student uploaded a staged photo. The app saved its validated
  copy and removed the original staging object.
- Supabase Cron recorded the lapsed-INC smoke run at 02:38 and the scheduled
  photo-cleanup run at 02:40 Asia/Manila. The photo worker returned HTTP 200.
  The scheduled mail worker returned HTTP 200 at 02:50 with 12 sent and zero
  failures. Mail runs every minute, photo cleanup every five minutes, and
  lapsed INC daily at 00:01 Asia/Manila.
- Direct requests to `/adviser/advisees` and `/docs/openapi` on the staging
  domain served the app shell. A Playwright run signed in as a synthetic
  student, reloaded the profile deep link, and observed 11 successful data
  gateway collections using the expected schema header.

## Hosted verification procedure

1. Sign in with a provisioned Google QA account and confirm its first identity
   activates the invitation. Confirm an unregistered Google account is denied.
2. Run first sign-in with password and Google. Verify one
   `sign_in_succeeded` event per session, then refresh each session and verify the
   count is unchanged.
3. Upload and commit a synthetic student photo. Verify the staging path
   reservation, queue processing, and cleanup while the committed photo remains
   available.
4. Capture a successful signed-in frontend collection request using
   `Accept-Profile: saais_api`. On a collection with more than 20 visible rows,
   verify the default page returns 20 and verify that the same signed-in session
   is denied on a direct collection request.
5. Record a successful scheduled run for the mail worker, photo cleanup, and
   lapsed INC. For mail, use authorized test recipients and verify delivery to
   a test mailbox. Check the scheduler run result and the corresponding
   application outcome for each job.
6. Record the staged commit, Vercel origin, role flows, and a signed-in deep-link
   refresh. Put times, test results and redacted evidence links in issue #51.
