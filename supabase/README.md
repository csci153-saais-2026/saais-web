# Jerome's SAAIS Edge Functions

This implementation targets OpenAPI **0.3.0 at `cfa620c97c2a506537825edc1323f37ee5f843b3`**. The checked-in `contract/` remains at 0.2.1, as explicitly requested. Integrate the approved 0.3.0 contract, generated client and frontend before deployment. The generated runtime snapshot deliberately reads the assigned Git object, not the working-tree YAML.

## Route ownership

| Deployed function | Implementation |
| --- | --- |
| `catalog` | 30 assigned writes; `20261112000500_jerome_catalog.sql` |
| `school-terms` | Department closure/reopening and Admin override; `20261112000600_jerome_school_terms.sql` |
| `students` | Jerome's 11 student routes; credit and curriculum migrations |
| `curriculum-transfers` | One approval/rejection route; curriculum migration |
| `notifications` | Mark-read and scheduled evaluation; notification migration |

The HTTP layer validates headers, path syntax, JSON encoding and size, verifies the user with Supabase Auth, and invokes `public.jerome_operation` with the **caller's JWT and public project key**. No service-role key is used. That SQL boundary independently validates the pinned request schema, active session/profile, provisioned role assignments, scope and ownership. It dispatches to private domain routines and validates/project-filters the response before committing. Constraints, history, audit and notification writes participate in the same transaction.

## Local checks

Run from the repository root with the existing npm dependencies installed:

```powershell
node --test supabase/tests/*.test.mjs
node node_modules/typescript/bin/tsc -p supabase/tsconfig.json
node supabase/tools/check-pinned-contract.cjs
node supabase/tools/test-database.cjs
```

The database runner uses PostgreSQL binaries from `C:/Program Files/PostgreSQL/18/bin` by default. Set `PG_BINARY_DIR` for a different installation. It starts an isolated cluster under ignored `supabase/.temp/jerome-pg` on `127.0.0.1:55432`, creates a uniquely named temporary database, applies every migration, runs SQL tests plus a two-connection concurrency test, drops only that temporary database, and stops its server. Keep that port free. Its `bootstrap.sql` supplies a minimal **test-only** Auth schema; do not apply it to a Supabase project.

The SQL suite checks successful execution of all 47 operations, response validation, body/path validation, unauthenticated and forbidden requests, scope isolation, multi-role authorization, owned notifications, RLS/grants, stale updates, history, conflicts, late transaction rollback, Unicode duplicate normalization, zero-unit snapshots, INC/direct-credit collisions and concurrent writes. It uses synthetic accounts and data.

These checks do not emulate Supabase's gateway, cryptographic JWT verification, GoTrue, PostgREST, Deno isolates, cron extension or email delivery. Run `deno task --config supabase/deno.json check` and deployed authenticated integration tests when those services are available. Deno and Docker were unavailable during this implementation; PostgreSQL tests and TypeScript checks were executed instead.

## Runtime configuration

- `SUPABASE_URL`: project API URL.
- `SUPABASE_PUBLISHABLE_KEYS`: hosted named publishable-key JSON dictionary. The singular `SUPABASE_PUBLISHABLE_KEY` and legacy `SUPABASE_ANON_KEY` are also supported. The incoming key must match one of these public keys and is forwarded upstream. Secret/service-role keys are excluded.
- `CORS_ALLOWED_ORIGINS`: comma-separated exact SPA origins. Requests carrying an unlisted Origin are denied. Requests without Origin still require both project key and user JWT.
- The supplied `config.toml` keeps `verify_jwt=true` for all five deployed functions. Header/key handling follows [Supabase's auth-header documentation](https://supabase.com/docs/guides/functions/auth-headers) and [documented environment variables](https://supabase.com/docs/guides/functions/secrets).
- The database requires a non-expired session in `auth.sessions`, an active provisioned profile, and trusted `role_assignment` rows. Client metadata never grants roles.
- Successful calls consume a database-enforced allowance of 120 calls per identity per minute. Rejected transactions roll back their counter update. Configure gateway IP/failed-request rate limits separately; no IP-limit configuration was deployed here.
- HTTP and RPC bodies are capped at 1 MiB; RPC path parameters are capped at 8 KiB. Per-field/array bounds come from the pinned contract. There are no query parameters on these assigned writes.

## Database integration

The six `20261009...` migrations are copied unchanged from the existing team branch `origin/supabase/migrations` at `ec38495`. They remain the team's original schema contribution. Jerome's later migrations add required 0.3.0 dependencies, relax obsolete positive-only constraints for empty drafts/zero-unit requirements, and implement the assigned workflows. Existing rows are retained. Existing primary `student`, `adviser` and `admin` roles are backfilled into role assignments.

Review existing provisioning before enabling the new roles. The old three-role schema did not contain the required Head/Staff/Dean assignments. Provision their actual department/faculty scopes through the team's authorized account workflow, not through client payloads. Do not reapply copied base SQL manually to a project that already records those migration versions.

Only `public.jerome_operation` is an authenticated write RPC. Private domain functions, schema snapshots and history tables cannot be called or changed by browser roles. Raw academic writes are revoked; RLS remains enabled. Added SELECT policies expose only a caller's own notifications and role assignments. The other Data API reads, their safe projections, and their complete role/scope policies remain the team's separate integration work. Their absence is fail-closed.

Audit and credit history reject update/delete/truncate. Credit edits retain the previous row in `saais_private.credit_history` with effective dates. Revocation preserves source attempts and current/historical decision values. Writes bump `saais_private.cache_invalidation` for the affected student. Report/cache consumers must read fresh data or use that revision; no existing cache implementation was present to modify.

## Matt's shared students entry point

No existing `students/index.ts` or Matt handlers were present in the starting checkout. The new entry point serves Jerome's routes; `students/jerome-routes.ts` exports their separate 11-operation list. Matt should compose his handlers at this entry point and retain Jerome's routes. `createHandler` in `_shared/http.ts` is exported for composition; unknown routes return 404 rather than placeholders. Matt's roster, grade, adviser, advising, import and other assigned handlers were not implemented or replaced.

All student/credit writers must lock the student's profile row before changing decisions, attempts, assignments or completions. Jerome's public write boundary also takes transaction advisory lock `(531201, 1)` before domain writes. Preserve that lock order when composing multi-step transactions. Shared triggers prevent a passing direct attempt or INC completion from duplicating live credit. A conflicting decision must be resolved through the authorized audited workflow; grade routes must handle the resulting 409. These are shared integrity dependencies, not replacements for Matt's grade handlers.

## Scheduled notifications and delivery

The evaluator supports approaching/lapsed INC deadlines, standing thresholds, encoding deadlines, unassigned students, expiring invitations and overdue backups. Scope comes from the caller's actual Head assignment or Admin role. Omitted dates use Asia/Manila. Deterministic recipient-specific keys prevent duplicates; timestamp keys use UTC independently of the database session timezone. A response contains at most 500 newly inserted notifications. Repeat an evaluation to process any remaining new candidates.

Dry-run reports candidate counts, inserts no notifications, returns `total_created=0` and an empty `created_notifications`. It still participates in the authenticated request budget. The scheduled private entry point does not consume a user budget.

Provision `system_settings` through the team's settings workflow. No institutional standing thresholds or sender addresses are fabricated. The contract does not specify the backup-reminder age: set the approved positive day count in `saais_private.alert_configuration.backup_overdue_days` through an owner-run migration. Until configured, backup reminders have no candidates. Other scheduled rules continue to evaluate.

If `pg_cron` exists when the migration runs, it installs `saais-daily-alerts` at `5 16 * * *` with UTC cron time (00:05 Asia/Manila). Otherwise enable the extension through the project's deployment workflow, then install the same job calling `select saais_private.scheduled_alerts()`. Confirm `cron.timezone=UTC`. The job owner must be able to invoke the private routine. Cron installation was not exercised by the plain PostgreSQL harness.

Notification rows with `email_delivery_status='pending'` form the delivery queue. Connect the team's mail worker, sender configuration and retries before promising email delivery. No emails were sent or delivery transport deployed here.

## Contract interpretation notes

- Curriculum cloning copies the source's terms/slots and uses the requested new version metadata. Both flat and nested `curriculum` metadata forms are supported; explicitly requesting a clone takes its terms from the source.
- Curriculum totals are recalculated from slots, including nested creates, cloning and slot edits/deletes. Earlier attempt-unit snapshots remain unchanged when catalog units change.
- Preview chooses one passing source per destination using course identity before pair rules, retains additional-credit sources as permitted by the pinned enum, and computes carried/lost passing units and the units-weighted GWA of carried sources. The schema does not define a more detailed projected-GWA formula; confirm this interpretation with the academic owner before production acceptance.
- Sources already used by live credit decisions are excluded from automatic reassignment matches. Earlier decisions remain intact; conflicting old decisions require explicit review/revocation before reusing the source. No historical decision is silently overwritten.
- Assignment dates must follow the previous assignment's start, match the target's effectivity, and use an active target version. Future-dated assignment changes are rejected because the current-assignment model is end-date based. The contract's lifecycle/effectivity descriptions do not fully enumerate these transitions; confirm the eligibility policy with the team.
- School-term catalog writes cannot be used by Head/Staff to bypass the explicit Admin-only institution-lock rule. Reopening a department leaves the institution lock intact.

See `docs/backend/jerome-implementation-report.md` for the operation-by-operation status, actual verification results and Git contribution inventory.
