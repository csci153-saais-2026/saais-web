# Backend integration status

PR #70 integrates the merged #68 and #113 backend contributions. The shared router registers 81 operations across 13 Edge Function entry points. This includes 47 catalog/academic operations and 34 student, advising, reporting and account operations. Saved-attempt deletion is a rejection endpoint that preserves academic history.

Both runtime snapshots use approved OpenAPI 0.3.1 at `8df551183962d19ab724c9f33c9a5f6d884d3ba5`, bundled SHA-256 `4be525583cfa343782e00e3c1daee087da92a213734e7ba75ff00006f5418d6f`. Additive migrations retain the shared schema definitions needed by both RPC entry points.

The advising assistant requires the student's current adviser assignment. Reassignment removes the former adviser's access to assistant context. Its HTTP tests cover authentication, scope rejection before provider calls, malformed context, provider errors/timeouts, bounded output and the approved response fields. Its SQL test performs a real assignment handoff with synthetic accounts. The contract's generic `current-or-historic-assigned-students-read-only` scope label needs a future wording clarification for this current-adviser rule, requested in the PR review. The approved contract hash is retained.

## Remaining work and affected workflows

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
