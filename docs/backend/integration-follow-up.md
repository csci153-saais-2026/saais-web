# Backend integration status

PR #70 integrates the merged #68 and #113 backend contributions. The shared router registers 81 operations across 13 Edge Function entry points. This includes 47 catalog/academic operations and 34 student, advising, reporting and account operations. Saved-attempt deletion is a rejection endpoint that preserves academic history.

Both runtime snapshots use approved OpenAPI 0.3.1 at `8df551183962d19ab724c9f33c9a5f6d884d3ba5`, bundled SHA-256 `4be525583cfa343782e00e3c1daee087da92a213734e7ba75ff00006f5418d6f`. Additive migrations retain the shared schema definitions needed by both RPC entry points.

The advising assistant requires the student's current adviser assignment. Reassignment removes the former adviser's access to assistant context. Its HTTP tests cover authentication, scope rejection before provider calls, malformed context, provider errors/timeouts, bounded output and the approved response fields. Its SQL test performs a real assignment handoff with synthetic accounts. The contract's generic `current-or-historic-assigned-students-read-only` scope label needs a future wording clarification for this current-adviser rule, requested in the PR review. The approved contract hash is retained.

## Original PR #70 follow-up list

| Work | What remains | Affected workflow | Tracking |
| --- | --- | --- | --- |
| Invitation lifecycle | Implement `inviteUser`, `previewInviteToken`, `verifyInviteToken`, `declineInviteToken`, `resendAccountInvite`, and `revokeAccountInvite`, using trusted Auth provisioning and invitation state. These operations are reserved in the contract snapshot and have no active handler in this PR. | Creating invited accounts, previewing/accepting/declining invitations, resend and revoke actions. | Backend epic #3 and provisioning/deployment setup #51. |
| Student batch provisioning | Implement `importStudentsBatch`, including Auth identity creation, initial curriculum/adviser assignments and recovery from partial provisioning failures. | Confirming a spreadsheet import that creates student accounts and academic records. The implemented grade import handles existing accounts. | Backend epic #3 and setup #51. |
| PostgREST reads | Complete scoped read policies and safe projections, then exercise them with actual role sessions. Some feature-specific policies already exist. | Frontend catalog, record and audit reads that use `/rest/v1/`. Edge RPC tests alone do not prove these reads. | Schema/RLS #7 and pgTAP #50. |
| Auth deployment and lifecycle | Verify hosted sessions, role provisioning, Google OAuth and lifecycle hooks in the target Supabase project. | Sign-in, first account activation, account eligibility, trusted role changes and auth audit events. | Setup #51. |
| Email delivery | Connect a mail worker with approved sender settings and retry handling. | Invitation emails and delivery of queued notification emails. | Backend epic #3 and setup #51. |
| Scheduled execution | Verify `pg_cron` installation, job ownership and schedule in the deployed project, including the lapsed-INC recomputation integration. | Automatic deadline reminders, standing alerts and scheduled INC/GWA updates. | Scheduled recomputation #49 and setup #51. |
| Private photo Storage | Provision the `student-photos` bucket and scoped upload/read/delete policies. Verify metadata routes against actual Storage objects. | Student photo upload, display and removal. Local SQL tests use a Storage stand-in. | Setup #51. |
| Assistant deployment and frontend wiring | Configure the approved provider, credentials and model. Connect and enable the real Adviser-page flow, which the review reports is disabled outside mock mode. Verify real Supabase authorization before provider calls. | Production record-grounded adviser questions. Local HTTP tests use a provider stub. | Backend epic #3, setup #51 and the Adviser frontend owner. |

These are follow-up tasks. PR #70 completes the integration and review fixes for the existing 34 routes. Deployment requires the relevant provisioning and service work above. Local tests use an Auth schema stand-in and synthetic records. The hosted Supabase gateway, Auth, Storage and AI provider still require integration verification.

## Local validation

Run the frontend and backend checks from the repository root with Node 24.

```sh
npm ci
npm run typecheck
npm run lint
node node_modules/typescript/bin/tsc -p supabase/tsconfig.json
node --test supabase/tests/*.test.mjs
deno task --config supabase/deno.json check
npm run contract:lint
npm run contract:security
npm run contract:spectral
npm run contract:check
npm run build
```

Set `PG_BINARY_DIR` to the installed PostgreSQL binary directory, then run `node supabase/tools/test-database.cjs`. The runner applies all migrations for both suites. The domain suite includes the catalog, cloning, credit and concurrency checks. The application suite starts with the initial catalog/people/student fixtures and rolls back each test file so its sample records do not alter the next test.

Relevant GitHub tracking is [backend #3](https://github.com/csci153-saais-2026/saais-web/issues/3), [RLS #7](https://github.com/csci153-saais-2026/saais-web/issues/7), [scheduling #49](https://github.com/csci153-saais-2026/saais-web/issues/49), [pgTAP #50](https://github.com/csci153-saais-2026/saais-web/issues/50), and [setup #51](https://github.com/csci153-saais-2026/saais-web/issues/51).

## Backend follow-up verification

PR #118 merged into `feat/backend` at `1bb81ce`. Its own-profile policy remains the public-schema bootstrap boundary. The shared API client sends `Accept-Profile: saais_api` on Supabase PostgREST reads. The Edge RPCs continue to use the default `public` schema. The views publish explicit contract fields, derive adviser contact and transfer labels, and apply the caller's student, department, or faculty scope. Raw audit snapshots are available to administrators. Assigned advisers keep historical record reads after handoff, while note changes, grade recording, the assistant, and private photo reads use the current assignment.

### Academic acceptance checks

| Issue | Entry point and verification |
| --- | --- |
| #46 | `recordGrades` implements the enrollment and initial grade workflow. `matt-enrollment.sql` checks the assigned adviser, cross-user denial, quarter-step grade validation, explicit enrollment and prerequisite override, existing passed courses, duplicate offerings, department and global term locks, audited writes, and rollback of a partially processed encoding batch. |
| #47 | `matt-students.sql` checks eligibility, cross-department bulk rollback, invalid dates, the outgoing and incoming history, and former adviser permissions. `concurrency.mjs` waits until the first reassignment transaction is holding its locks before submitting a second reassignment and verifies one audited winner. |
| #48 | `30_credits.sql` and `35_credit_failures.sql` check student-specific equivalency, unauthorized and invalid sources/destinations, source and destination collisions, the audit history, and retained academic attempts. |
| #49 | `lapsed-inc.sql` advances a private reference date across the deadline, checks GWA and delinquency, verifies the persisted INC and failed grade history, and exercises repeated and stale runs. |
| #50 | `scoped-reads.sql` uses the existing synthetic fixture conventions and tests all six roles, archived notes, staff remarks, account-scoped notifications, cross-department reads, and adviser handoff against the published projections. |

### Local checks

Start local Supabase, reset the disposable database without the seed, and run pgTAP. The runner includes the shared SQL fixtures in each rollback-only suite.

```sh
supabase start
node --test supabase/tools/test-attempt-result-gateway.mjs
supabase db reset --local --no-seed
node supabase/tools/test-pgtap.cjs
node --test supabase/tests/*.test.mjs
```

The existing `node supabase/tools/test-database.cjs` runner uses disposable PostgreSQL with Auth and Storage stand-ins. Set `PG_BINARY_DIR` to its binary directory. For browser or gateway testing, reset the local project with the repository seed and use the approved synthetic accounts. Avoid scripting hosted resets or loading this seed into shared environments.

The seeded local gateway checks used real signed-in sessions for Student, Adviser, Department Staff, Department Head, Dean, and Admin. Profile hydration, scoped student organization reads, recipient-only notifications, and direct private-field denial passed. A student uploaded and deleted a PNG in the private bucket, all six authorized sessions downloaded it, and public and out-of-faculty requests failed. The local Edge gateway also passed invitation retry, token preview, one-time password activation, and student batch preview and partial commit. Email delivery and the adviser assistant use stub providers in automated tests.

In the supplied hosted project, each of the six approved test accounts signed in with the public project key, returned one own profile, and returned zero profiles for a cross-user query on the existing public route. The new read schema returned 406 for every role. The hosted checks still pending are role-scoped catalog and student record queries, archived notes, attempt remarks, audit metadata, notification isolation, private-field restrictions, and private Storage across assignments and departments. Hosted invitation mail, real assistant responses after a reassignment, and scheduled runs require deployment and provider configuration.

### Daily INC recomputation

`saais-daily-lapsed-inc-gwa` runs at 00:01 Asia/Manila (`1 16 * * *` with UTC cron), ahead of the existing 00:05 alerts. An unresolved INC contributes 5.00 starting the day after its deadline. The job preserves the attempt and recomputes cumulative GWA, failed units, and term delinquency for affected students using the same formulas as the live read paths. It records dated values in `saais_private.lapsed_inc_recomputation` and advances each changed student's cache revision once per run.

The migration installs the job when `pg_cron` is available. If the team enables Cron afterward, the database owner can register it with `cron.schedule('saais-daily-lapsed-inc-gwa', '1 16 * * *', 'select public.recompute_lapsed_inc_gwa()')`. Confirm the schedule, job owner, and UTC timezone in Supabase Cron, then monitor `cron.job_run_details`. A failed run rolls back its writes. Operators can retry with `select public.recompute_lapsed_inc_gwa()` as the owner or service role. The next run catches previously missed deadlines. A same-day retry uses the same snapshot key and skips unchanged results.

### Deployment and provider coordination

The following acceptance checks remain open for the designated hosted test project. The Supabase project owner coordinates Data API, Cron, and Edge deployments. The provider owners supply verified sender settings and approved assistant credentials through the team's secret store. The Auth and Google Cloud owners coordinate provider activation under issue #51.

- **Data API and Storage.** Apply the additive migrations in the team-designated test project and add `saais_api` to the exposed Data API schemas while keeping `public` as the default. Deploy the shared API client with the profile header. Confirm all six roles against the actual catalog, profile, student organization, grades, archived notes, staff remarks, and audit query paths. Check cross-user, cross-department, and cross-faculty denials, base-table field restrictions, recipient-only notifications, and current adviser photo access. Deploy and verify the private `student-photos` bucket. Use signed-in authenticated Storage downloads and own-student or administrator writes.
- **Accounts.** Deploy `auth`, `accounts`, and `students` against the same schema. The `auth` function checks the project key and limits each issued invitation token to 60 requests per minute per public operation using a shared database counter. Unknown tokens do not create budget rows; counters are removed with their invitations. This prevents one token from exhausting another token's allowance, but does not rate-limit traffic by source: before public deployment, configure and verify an independently enforced per-source gateway/WAF limit that cannot be bypassed by calling the Supabase function URL directly. Do not trust client-supplied forwarding headers as identity. Monitor rejected requests and gateway enforcement. Protected entry points verify the signed-in caller and recheck database scope. Invitation creation, resend, revoke, and student batch imports consume the existing per-actor database request budget before provisioning work. An admitted request still counts when downstream validation or provisioning fails. Supabase supplies the service-role credential server-side. A completed row can be retried with its original normalized input even after curriculum eligibility changes. For an unfinished student reservation whose adviser becomes ineligible, its original staff owner or an administrator can retry the existing operation with only adviser_id corrected; the full request and replacement adviser are revalidated and the Auth identity bearing the matching reservation metadata is retained. Other request changes are rejected. The reservation ties the trusted Auth identity to the same database row, so a failed response after Auth creation can resume without adopting unrelated identities or duplicating assignments. Unfinished reservations remain visible to operators in `saais_private.invite_reservation`. Inspect the reservation and its matching Auth metadata before resolving an abandoned reservation. **First Google sign-in remains open under [issue #51](https://github.com/csci153-saais-2026/saais-web/issues/51).** After Google OAuth and the Auth hooks are configured, verify that the first Google sign-in with the exact provisioned and verified `@vsu.edu.ph` email activates the invited profile and invalidates its unused password setup token. Verify that an ineligible identity cannot activate a profile. The local password-invitation tests exercise password setup only.
- **Email.** Apply the recipient-filtering migration and deploy `mail-delivery` together. Configure `SAAIS_RESEND_API_KEY`, a verified `SAAIS_MAIL_FROM`, the HTTPS `SAAIS_SITE_URL`, and a random `SAAIS_MAIL_WORKER_SECRET` in the approved secret store. Set `SAAIS_MAIL_ALLOWED_RECIPIENTS` to the authorized test mailboxes in staging and test. A missing or empty list blocks the worker from claiming messages. When a configured list excludes a recipient, the queue retains the message without consuming a delivery attempt. After correcting the list, the next scheduled worker run can claim eligible messages. Operators can diagnose held mail by comparing pending recipients with the configured list through approved database access. Invitations still follow their normal expiration and resend lifecycle. For unrestricted delivery in an explicitly approved production deployment, set `SAAIS_MAIL_ENVIRONMENT=production` and leave the allowlist unset. An explicitly empty list blocks delivery in every environment. Schedule an HTTPS POST every minute with the `x-saais-mail-secret` header from the scheduler's secret store. Set up monitoring for non-2xx worker responses, increasing retry counts, and failed notifications. Retries back off and use the same Resend idempotency key. The worker sends invitation links in URL fragments and notification emails that direct the user to sign in. Confirm delivery, resend, and revocation with the approved mailboxes before enabling use.
- **Supabase Cron.** The Supabase project owner must verify the lapsed-INC and alert jobs in the hosted Cron dashboard, confirm the schedules and job roles, and review successful runs in `cron.job_run_details`. The email scheduler also requires its approved worker secret and a successful authorized-mailbox run.
- **Adviser assistant.** The backend already checks the current assignment before retrieving academic context and sending it to the provider. Configure one or more approved HTTPS providers—Google Gemini (`SAAIS_ASSISTANT_GEMINI_API_KEY`, `SAAIS_ASSISTANT_GEMINI_MODEL`, optional `SAAIS_ASSISTANT_GEMINI_ENDPOINT` for native `generateContent` or OpenAI-compatible paths), NVIDIA NIM (`SAAIS_ASSISTANT_NVIDIA_API_KEY`, `SAAIS_ASSISTANT_NVIDIA_MODEL`, optional `SAAIS_ASSISTANT_NVIDIA_ENDPOINT`), or OpenAI-compatible Chat Completions (`SAAIS_ASSISTANT_OPENAI_API_KEY`, `SAAIS_ASSISTANT_OPENAI_MODEL`, optional `SAAIS_ASSISTANT_OPENAI_ENDPOINT`, or generic `SAAIS_ASSISTANT_ENDPOINT`, `SAAIS_ASSISTANT_MODEL`, and `SAAIS_ASSISTANT_API_KEY`)—with optional priority order in `SAAIS_ASSISTANT_PROVIDERS` (for example `gemini,nvidia,openai`), then deploy `students`. The Adviser frontend owner can enable the existing `askAdvisingAssistant` call from `src/routes/adviser/advisees/advising/AdvisingAssistant.tsx` for configured Supabase deployments. Verify a current adviser can ask a grounded question and that the former adviser gets 403 after reassignment before any provider call.

Provider attempts share a 30-second total budget, divided among the remaining candidates; a single configured provider receives the full budget. Safety refusals and incomplete responses stop the chain instead of sending the request to another provider. The priority list orders providers, and other configured providers can still be tried; configure credentials only for providers approved to receive the advising request. When a native Gemini endpoint includes a model in its URL, that model must match `SAAIS_ASSISTANT_GEMINI_MODEL` (or the corresponding generic model). Legacy and provider-specific credentials with the same endpoint and model are distinct fallback candidates when their keys differ; remove obsolete credentials after rotation.
