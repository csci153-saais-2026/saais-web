# Jerome implementation and contribution report

Date: 12 November 2026 (Asia/Manila). Branch: `feat/jerome-edge-functions`. Initial checkout: `03ce7ac1764334deeee564601de8a68e6a4bdf00`, clean and matching `feat/backend`. No branch switch, push, PR creation, reset, stash, amend or history rewrite was performed.

## Outcome and verification boundary

All **47 assigned operations have domain implementations**, with a successful PostgreSQL test for every operation, an HTTP routing/status test for every method/path, shared authorization/input sweeps, and schema-validated SQL responses. No operation is a mock response, route-only skeleton or 501 handler.

Each operation is conservatively classified **Implemented but not fully tested** below: local PostgreSQL and HTTP tests passed, but a live Supabase gateway/Auth/PostgREST/Deno integration was unavailable. This status does not mean its handler is missing. No assigned operation is left blocked on implementation. Deployment and academic-policy confirmations remain explicit limitations.

The authoritative implementation baseline is OpenAPI 0.3.0 at `cfa620c97c2a506537825edc1323f37ee5f843b3`. The actual checkout carries OpenAPI 0.2.1 from `cb9b927`. Eighteen assigned operations are absent there. After reporting that mismatch, the user explicitly directed targeting `cfa620c` while leaving `contract/` unchanged. Both supplied documents were read completely (the workflow PDF has 11 pages). Their assignment/architecture guidance was treated as reference material; the user's request and baseline decision govern the work.

## Operation-by-operation status and contract verification

For every row, the exact method/path, input reference, declared success status/schema and roles match the assigned Git contract. The runtime snapshot is checked against that Git object; SQL independently validates path/body inputs, authorizes the caller, filters response fields and validates its response schema before commit. The local SQL coverage assertion requires all 47 IDs. Production transport/auth integration and exhaustive academic edge cases remain unverified.

| Operation ID | Status | Exact method and path | Success | Local SQL verification |
| --- | --- | --- | --- | --- |
| `createFaculty` | Implemented but not fully tested | `POST /functions/v1/catalog/faculty` | 201 Faculty | 10_catalog.sql; 60_security.sql |
| `updateFaculty` | Implemented but not fully tested | `PATCH /functions/v1/catalog/faculty/{id}` | 200 Faculty | 10_catalog.sql; 60_security.sql |
| `deleteFaculty` | Implemented but not fully tested | `DELETE /functions/v1/catalog/faculty/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createDepartment` | Implemented but not fully tested | `POST /functions/v1/catalog/department` | 201 Department | 10_catalog.sql; 60_security.sql |
| `updateDepartment` | Implemented but not fully tested | `PATCH /functions/v1/catalog/department/{id}` | 200 Department | 10_catalog.sql; 60_security.sql |
| `deleteDepartment` | Implemented but not fully tested | `DELETE /functions/v1/catalog/department/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createProgram` | Implemented but not fully tested | `POST /functions/v1/catalog/program` | 201 Program | 10_catalog.sql; 60_security.sql |
| `updateProgram` | Implemented but not fully tested | `PATCH /functions/v1/catalog/program/{id}` | 200 Program | 10_catalog.sql; 60_security.sql |
| `deleteProgram` | Implemented but not fully tested | `DELETE /functions/v1/catalog/program/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createCurriculumVersion` | Implemented but not fully tested | `POST /functions/v1/catalog/curriculum_version` | 201 CurriculumVersion | 10_catalog.sql; 60_security.sql |
| `updateCurriculumVersion` | Implemented but not fully tested | `PATCH /functions/v1/catalog/curriculum_version/{id}` | 200 CurriculumVersion | 10_catalog.sql; 60_security.sql |
| `deleteCurriculumVersion` | Implemented but not fully tested | `DELETE /functions/v1/catalog/curriculum_version/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createCurriculumTerm` | Implemented but not fully tested | `POST /functions/v1/catalog/curriculum_term` | 201 CurriculumTerm | 10_catalog.sql; 60_security.sql |
| `updateCurriculumTerm` | Implemented but not fully tested | `PATCH /functions/v1/catalog/curriculum_term/{id}` | 200 CurriculumTerm | 10_catalog.sql; 60_security.sql |
| `deleteCurriculumTerm` | Implemented but not fully tested | `DELETE /functions/v1/catalog/curriculum_term/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createCurriculumTermCourse` | Implemented but not fully tested | `POST /functions/v1/catalog/curriculum_term_course` | 201 CurriculumTermCourse | 10_catalog.sql; 60_security.sql |
| `updateCurriculumTermCourse` | Implemented but not fully tested | `PATCH /functions/v1/catalog/curriculum_term_course/{id}` | 200 CurriculumTermCourse | 10_catalog.sql; 60_security.sql |
| `deleteCurriculumTermCourse` | Implemented but not fully tested | `DELETE /functions/v1/catalog/curriculum_term_course/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createCourse` | Implemented but not fully tested | `POST /functions/v1/catalog/course` | 201 Course | 10_catalog.sql; 60_security.sql |
| `updateCourse` | Implemented but not fully tested | `PATCH /functions/v1/catalog/course/{id}` | 200 Course | 10_catalog.sql; 60_security.sql |
| `deleteCourse` | Implemented but not fully tested | `DELETE /functions/v1/catalog/course/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createPrerequisite` | Implemented but not fully tested | `POST /functions/v1/catalog/prerequisite` | 201 Prerequisite | 10_catalog.sql; 60_security.sql |
| `deletePrerequisite` | Implemented but not fully tested | `DELETE /functions/v1/catalog/prerequisite/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createSchoolTerm` | Implemented but not fully tested | `POST /functions/v1/catalog/school_term` | 201 SchoolTerm | 10_catalog.sql; 60_security.sql |
| `updateSchoolTerm` | Implemented but not fully tested | `PATCH /functions/v1/catalog/school_term/{id}` | 200 SchoolTerm | 10_catalog.sql; 60_security.sql |
| `createCourseOffering` | Implemented but not fully tested | `POST /functions/v1/catalog/course_offering` | 201 CourseOffering | 10_catalog.sql; 60_security.sql |
| `updateCourseOffering` | Implemented but not fully tested | `PATCH /functions/v1/catalog/course_offering/{id}` | 200 CourseOffering | 10_catalog.sql; 60_security.sql |
| `deleteCourseOffering` | Implemented but not fully tested | `DELETE /functions/v1/catalog/course_offering/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `closeSchoolTermEncoding` | Implemented but not fully tested | `POST /functions/v1/school-terms/{school_term_id}/close-encoding` | 200 SchoolTerm | 20_school_terms.sql; 60_security.sql |
| `reopenDepartmentTermEncoding` | Implemented but not fully tested | `POST /functions/v1/school-terms/{school_term_id}/reopen-encoding` | 200 DepartmentTermEncodingClosure | 20_school_terms.sql; 60_security.sql |
| `setSchoolTermOverride` | Implemented but not fully tested | `PUT /functions/v1/school-terms/{school_term_id}/override` | 200 SchoolTerm | 20_school_terms.sql; 60_security.sql |
| `assignStudentCurriculum` | Implemented but not fully tested | `PUT /functions/v1/students/{student_id}/curriculum` | 200 StudentOrganization | 40_curriculum.sql; 45_transfer_rollback.sql; 60_security.sql |
| `createElectiveMapping` | Implemented but not fully tested | `POST /functions/v1/students/{student_id}/elective-mappings` | 201 ElectiveMapping | 30_credits.sql; 35_credit_failures.sql; 60_security.sql |
| `updateElectiveMapping` | Implemented but not fully tested | `PATCH /functions/v1/students/{student_id}/elective-mappings/{decision_id}` | 200 ElectiveMapping | 30_credits.sql; 35_credit_failures.sql; 60_security.sql |
| `revokeElectiveMapping` | Implemented but not fully tested | `POST /functions/v1/students/{student_id}/elective-mappings/{decision_id}/revoke` | 200 ElectiveMapping | 30_credits.sql; 35_credit_failures.sql; 60_security.sql |
| `createEquivalencyDecision` | Implemented but not fully tested | `POST /functions/v1/students/{student_id}/equivalencies` | 201 EquivalencyDecision | 30_credits.sql; 35_credit_failures.sql; 60_security.sql |
| `updateEquivalencyDecision` | Implemented but not fully tested | `PATCH /functions/v1/students/{student_id}/equivalencies/{decision_id}` | 200 EquivalencyDecision | 30_credits.sql; 35_credit_failures.sql; 60_security.sql |
| `revokeEquivalencyDecision` | Implemented but not fully tested | `POST /functions/v1/students/{student_id}/equivalencies/{decision_id}/revoke` | 200 EquivalencyDecision | 30_credits.sql; 35_credit_failures.sql; 60_security.sql |
| `previewCurriculumShift` | Implemented but not fully tested | `POST /functions/v1/students/{student_id}/shift-preview` | 200 ShiftPreviewResponse | 40_curriculum.sql; 45_transfer_rollback.sql; 60_security.sql |
| `endorseCurriculumTransfer` | Implemented but not fully tested | `POST /functions/v1/students/{student_id}/curriculum-transfers` | 201 CurriculumTransferRequest | 40_curriculum.sql; 45_transfer_rollback.sql; 60_security.sql |
| `decideCurriculumTransfer` | Implemented but not fully tested | `POST /functions/v1/curriculum-transfers/{transfer_id}/decision` | 200 CurriculumTransferRequest | 40_curriculum.sql; 45_transfer_rollback.sql; 60_security.sql |
| `createCurriculumPairEquivalence` | Implemented but not fully tested | `POST /functions/v1/catalog/curriculum-pair-equivalences` | 201 CurriculumPairEquivalence | 10_catalog.sql; 60_security.sql |
| `deleteCurriculumPairEquivalence` | Implemented but not fully tested | `DELETE /functions/v1/catalog/curriculum-pair-equivalences/{id}` | 204 (empty body) | 10_catalog.sql; 60_security.sql |
| `createOutsideCredit` | Implemented but not fully tested | `POST /functions/v1/students/{student_id}/outside-credits` | 201 OutsideCredit | 30_credits.sql; 35_credit_failures.sql; 60_security.sql |
| `revokeOutsideCredit` | Implemented but not fully tested | `POST /functions/v1/students/{student_id}/outside-credits/{credit_id}/revoke` | 200 OutsideCredit | 30_credits.sql; 35_credit_failures.sql; 60_security.sql |
| `markNotificationsRead` | Implemented but not fully tested | `POST /functions/v1/notifications/mark-read` | 200 MarkNotificationsReadResponse | 50_notifications.sql; 60_security.sql |
| `evaluateScheduledNotifications` | Implemented but not fully tested | `POST /functions/v1/notifications/evaluate-alerts` | 200 EvaluateAlertsResponse | 50_notifications.sql; 60_security.sql |

The implementation checklist records the corresponding request schema and role list for each operation. HTTP tests exercise required headers, both hosted/local path forms, CORS, malformed identifiers/JSON, unknown queries, body bounds, authentication failure, controlled conflicts/rate limits and sanitized internal errors. SQL tests additionally exercise missing/unknown request fields and role/session rejection across the full operation set. Not every database failure variant has a separate per-operation test; shared boundaries are exercised in common.

## Created and modified files

All deliverable paths are new relative to the starting checkout; **no preexisting tracked frontend, contract, generated-client, dependency or backend implementation file was modified**. Later fixes modify files introduced by this task. Existing `supabase/seed.sql` and the original placeholder files remain intact.

The six `20261009...` migrations were reused unchanged from `origin/supabase/migrations` at `ec38495`; that original team schema is not claimed as newly authored Jerome domain design. It is included as a necessary integration dependency. The later migrations are Jerome's schema/transaction work. No deployed schema was changed.

Important files:

| File or group | Purpose |
| --- | --- |
| `supabase/functions/_shared/http.ts` | Common routed HTTP handler; verified Auth lookup, public-key checks, CORS, bounded JSON, path parsing and error sanitization. |
| `supabase/functions/_shared/serve.ts` | Deno startup and named/singular/legacy public-key environment support. |
| `supabase/functions/_shared/contract.json` | Generated 47-operation request/response snapshot from the assigned Git object. |
| Five function `index.ts` files | Entry points for catalog, school-terms, students, curriculum-transfers and notifications. |
| `supabase/functions/students/jerome-routes.ts` | Separate eleven-route integration list for the shared students function. |
| `supabase/config.toml` | JWT verification for the five functions and bounded API rows. |
| `supabase/tsconfig.json`, `supabase/deno.json` | Separate backend typecheck/runtime configuration. |
| `supabase/tools/snapshot-contract.cjs` | Deterministically regenerates the HTTP and SQL contract snapshots without editing the working-tree contract. |
| `supabase/tools/test-database.cjs` | Disposable PostgreSQL migration/workflow/concurrency test runner. |
| `supabase/tools/check-pinned-contract.cjs` | Runs the frozen contract's own lint/security checks against an ignored copy; only test-file paths are redirected. |
| `supabase/tools/generate-casefold.py` | Generates immutable Unicode 15.0.0 folding data for indexed outside-credit uniqueness on PostgreSQL 17/18. |
| `supabase/tests/` | Node HTTP/contract tests, SQL fixtures/assertions, workflow/security tests and real concurrent connections. |
| `supabase/README.md` | Runtime setup, commands, security, cron/email configuration, Matt integration and interpretation notes. |

Migration and database-function inventory:

| Migration | Database routines / contribution |
| --- | --- |
| `20261009000100_v3_identity.sql` | Original team base schema, imported unchanged |
| `20261009000110_v3_catalog.sql` | Original team base schema, imported unchanged |
| `20261009000120_v3_curriculum.sql` | Original team base schema, imported unchanged |
| `20261009000130_v3_assignments_terms.sql` | Original team base schema, imported unchanged |
| `20261009000140_v3_enrollment.sql` | Original team base schema, imported unchanged |
| `20261009000150_v3_credit_decisions.sql` | Original team base schema, imported unchanged |
| `20261112000100_jerome_roles.sql` | Additional role enum values |
| `20261112000200_jerome_dependencies.sql` | Role assignments, revised catalog fields, transfer/credit/closure/notification/audit/settings and private dependency tables |
| `20261112000300_jerome_infrastructure.sql` | `saais_private.fail`, `saais_private.valid`, `saais_private.actor`, `saais_private.has_role`, `saais_private.require_scope`, `saais_private.organization`, `saais_private.student_access`, `saais_private.audit`, `saais_private.notify`, `saais_private.recipients`, `saais_private.credit_snapshot` |
| `20261112000400_jerome_contract.sql` | Generated pinned contract document for SQL validation |
| `20261112000500_jerome_catalog.sql` | `saais_private.referenced`, `saais_private.department_of`, `saais_private.write_row`, `saais_private.total`, `saais_private.slot`, `saais_private.definition`, `saais_private.catalog` |
| `20261112000600_jerome_school_terms.sql` | `saais_private.school_terms` |
| `20261112000700_jerome_credits.sql` | `saais_private.passed`, `saais_private.credit_available`, `saais_private.credit_guard`, `saais_private.credits` |
| `20261112000750_jerome_curriculum.sql` | `saais_private.passing_sources`, `saais_private.shift_matches`, `saais_private.shift_preview`, `saais_private.assign_curriculum`, `saais_private.curriculum`, `saais_private.students` |
| `20261112000800_jerome_notifications.sql` | `saais_private.recipients`, `saais_private.alert_candidates`, `saais_private.evaluate_alerts`, `saais_private.notifications`, `saais_private.scheduled_alerts` |
| `20261112000900_jerome_rpc.sql` | `saais_private.project`, `public.jerome_operation` |
| `20261112001000_jerome_security.sql` | `saais_private.immutable_audit`, `saais_private.assert_direct_credit`, `saais_private.direct_credit_guard`, `saais_private.inc_direct_credit_guard`, `saais_private.own_active_record` |
| `20261112001050_jerome_unit_snapshots.sql` | Zero-unit attempt/credit snapshot constraints |
| `20261112001060_jerome_outside_keys.sql` | `saais_private.casefold`, `saais_private.outside_key` |

The inventory contains **19 migrations** (6 reused base migrations, 13 new migrations). The SQL harness executes 17 SQL files including its bootstrap and fixtures, followed by a separate two-connection test. Generated files are generated by tools rather than edited by hand.

Complete created-file inventory before this final documentation commit:

- `docs/backend/jerome-implementation-plan.md`
- `supabase/config.toml`
- `supabase/deno.json`
- `supabase/functions/_shared/contract.json`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/serve.ts`
- `supabase/functions/catalog/index.ts`
- `supabase/functions/curriculum-transfers/index.ts`
- `supabase/functions/notifications/index.ts`
- `supabase/functions/school-terms/index.ts`
- `supabase/functions/students/index.ts`
- `supabase/functions/students/jerome-routes.ts`
- `supabase/migrations/20261009000100_v3_identity.sql`
- `supabase/migrations/20261009000110_v3_catalog.sql`
- `supabase/migrations/20261009000120_v3_curriculum.sql`
- `supabase/migrations/20261009000130_v3_assignments_terms.sql`
- `supabase/migrations/20261009000140_v3_enrollment.sql`
- `supabase/migrations/20261009000150_v3_credit_decisions.sql`
- `supabase/migrations/20261112000100_jerome_roles.sql`
- `supabase/migrations/20261112000200_jerome_dependencies.sql`
- `supabase/migrations/20261112000300_jerome_infrastructure.sql`
- `supabase/migrations/20261112000400_jerome_contract.sql`
- `supabase/migrations/20261112000500_jerome_catalog.sql`
- `supabase/migrations/20261112000600_jerome_school_terms.sql`
- `supabase/migrations/20261112000700_jerome_credits.sql`
- `supabase/migrations/20261112000750_jerome_curriculum.sql`
- `supabase/migrations/20261112000800_jerome_notifications.sql`
- `supabase/migrations/20261112000900_jerome_rpc.sql`
- `supabase/migrations/20261112001000_jerome_security.sql`
- `supabase/migrations/20261112001050_jerome_unit_snapshots.sql`
- `supabase/migrations/20261112001060_jerome_outside_keys.sql`
- `supabase/tests/10_catalog.sql`
- `supabase/tests/15_people.sql`
- `supabase/tests/20_school_terms.sql`
- `supabase/tests/25_student_setup.sql`
- `supabase/tests/30_credits.sql`
- `supabase/tests/35_credit_failures.sql`
- `supabase/tests/36_zero_units.sql`
- `supabase/tests/37_inc_credit_collision.sql`
- `supabase/tests/38_unicode_outside.sql`
- `supabase/tests/40_curriculum.sql`
- `supabase/tests/45_transfer_rollback.sql`
- `supabase/tests/50_notifications.sql`
- `supabase/tests/60_security.sql`
- `supabase/tests/70_concurrency_setup.sql`
- `supabase/tests/bootstrap.sql`
- `supabase/tests/concurrency.mjs`
- `supabase/tests/contract.test.mjs`
- `supabase/tests/fixtures.sql`
- `supabase/tests/http.test.mjs`
- `supabase/tests/infrastructure.sql`
- `supabase/tools/check-pinned-contract.cjs`
- `supabase/tools/generate-casefold.py`
- `supabase/tools/snapshot-contract.cjs`
- `supabase/tools/test-database.cjs`
- `supabase/tsconfig.json`
- `supabase/README.md` (this final documentation unit)
- `docs/backend/jerome-implementation-report.md` (this report)

## Security and transaction implementation

- Authentication: gateway JWT checks stay enabled. The HTTP handler calls Supabase Auth with the submitted user token. The authenticated SQL RPC checks `auth.uid()`, a current `auth.sessions` record (including `not_after`), active profile and trusted roles; it locks and rechecks these records before domain mutation. Test Auth tables are stand-ins, not cryptographic verification.
- Authorization: role grants are loaded from `role_assignment`, never request metadata. Admin/Head/Staff permissions differ by operation. Department/faculty checks use actual relationships. Dean alone receives no write privilege. Multi-role users retain independently scoped grants; audit attribution records the grant actually used.
- Student access: current adviser writes require the exact live assignment. Preview can use authorized historical adviser access. Head/Admin writes derive the student's current department through curriculum/program. Source attempts and credit IDs must belong to the path student. Transfers preserve the adviser, including cross-department moves.
- Privilege boundary/RLS: writes use the caller's JWT to one SECURITY DEFINER RPC with explicit checks. Raw browser writes and private helper execution are revoked. RLS stays enabled; own-notification and own-role SELECT policies are supplied. Other Data API read projections/policies are separate team work and remain fail-closed here. No service-role credential is read or sent by the implementation.
- Validation: the pinned closed request schemas apply at SQL as well as HTTP boundaries, so direct RPC callers cannot supply extra actor/scope fields or bypass academic checks. IDs, dates, timestamps, numbers, bounds, union schemas, required fields and uniqueness are validated. Database constraint errors are sanitized; numeric overflow is a controlled 400.
- Atomicity/integrity: domain changes, audit, queued notifications and cache revision markers commit together. Students/parents are locked; a consistent transaction advisory lock serializes these operations. Live source/destination exclusivity crosses elective, equivalency, outside and direct completions, including INC resolution. Tests prove late approval rollback and a real concurrent duplicate rejection.
- History: old assignments/attempts/decisions are retained. Credit updates record effective-dated snapshots; revocation is soft and leaves attempt grades intact. Audit and credit history reject update/delete/truncate. Current/future calculation consumers must honor revocation dates and cache revision markers.
- CORS/errors: only configured origins are permitted; requests without Origin remain authenticated. Responses use no-store, controlled error schemas, declared success codes and empty 204 bodies. No SQL details, internal justifications or credentials are returned. Identity limits apply in SQL; gateway IP/failed-request limits still require deployment configuration.

## Executed checks and actual results

| Command/check | Actual result |
| --- | --- |
| `node --test supabase/tests/*.test.mjs` | 6 tests passed, including all 47 route/status dispatches and pinned snapshot comparison. HTTP upstreams are injected test doubles. |
| `node node_modules/typescript/bin/tsc -p supabase/tsconfig.json` | Passed. This is TypeScript checking, not Deno runtime execution. |
| `node supabase/tools/test-database.cjs` | Fresh migrations and SQL test files passed; 47 successful operation IDs required; authorization/validation sweep passed; late transfer approval rolled back; two concurrent writers produced one credit/audit and one PT409. |
| `node supabase/tools/check-pinned-contract.cjs` | Assigned 0.3.0 YAML lint passed; its original 16 security tests passed with only file paths redirected to the pinned copy. |
| `npm run contract:lint` | Existing working-tree 0.2.1 contract passed. |
| `npm run contract:security` | Existing working-tree suite: 7 tests passed. |
| `npm run contract:check` | Generated types matched by content; original CRLF working-tree form was restored after a line-ending-only dirty status. No contract/generated content change remains. |
| `npm run lint` | Passed. Backend function lint also passed separately. |
| `npm run build` | Passed: TypeScript build and Vite production bundle. |
| `npm run test` | Existing frontend suite: 3 files, 41 tests passed. |
| Temporary `vite preview --host 127.0.0.1 --port 4174 --strictPort` | GET `/styleguide` returned 200 and the built SPA entry; preview server stopped. No visual UI QA was needed for backend-only changes. |
| Scope/history checks in Git | No frontend/contract/dependency changes, no unrelated staging, no removed backend functionality and no push. |

Development failures were addressed rather than hidden: early SQL runs caught ambiguous parameter names, a curriculum-parent lookup that prevented total recomputation, and a missing server-derived pair-rule actor; fixes are covered by the passing reruns. Later review added regression coverage for nested cloning, draft term edits, zero-unit sources, scoped audit values, Unicode normalization, INC collisions and numeric/timestamp errors. The first attempt to run the pinned security script directly produced 13 failures because that script hardcodes the working-tree contract paths; redirecting only those paths to the pinned 0.3.0 files produced 16/16 passes. Neither contract was changed to make tests pass.

Environment limits: Deno was not installed and no `deno check`/Edge runtime run was executed. Docker Desktop's Linux engine was unavailable. The Supabase CLI version probe encountered a sandbox-denied telemetry-profile write; no local full-stack Supabase test was claimed. Initial localhost database access needed sandbox escalation; the disposable runner then executed real PostgreSQL tests and stopped its server. No hosted credentials or external student data were used.

## Matt integration requirements

Jerome owns these eleven students routes: `previewCurriculumShift`, `assignStudentCurriculum`, `endorseCurriculumTransfer`, `createOutsideCredit`, `revokeOutsideCredit`, `createElectiveMapping`, `updateElectiveMapping`, `revokeElectiveMapping`, `createEquivalencyDecision`, `updateEquivalencyDecision`, `revokeEquivalencyDecision`. The twelfth student-related operation, `decideCurriculumTransfer`, has its own function prefix.

There was no Matt implementation in this checkout to overwrite. Jerome's separate route list and exported HTTP factory are the integration points; preserve both route sets when Matt registers his handlers in `students/index.ts`. Matt's 41 operations have not been implemented here.

Coordinate the shared schema/RLS dependencies, trusted provisioning, consistent profile/advisory lock order, grade/INC conflict handling, current-adviser retention after transfers, report history semantics and cache revision consumption. A passing direct attempt/INC completion cannot bypass live credit; this shared integrity guard may return 409 to Matt's future grade routines. The team must integrate the same approved contract/client revision before end-to-end acceptance.

## Remaining issues and unverified acceptance

1. The checked-in 0.2.1 contract/client remains intentionally different from this 0.3.0 implementation. Team freeze approval and milestone integration are not performed by this task.
2. Real Supabase Auth, JWT signing-key handling, PostgREST error propagation, Deno execution, full-stack RLS behavior and deployed HTTP/SQL composition remain unverified. Local tests do not establish production readiness.
3. pg_cron installation was conditional and not exercised locally. Enable it before migration or install the documented private daily job afterward; verify UTC scheduling. Connect and verify the mail worker and retries for queued pending notifications.
4. Provision actual scoped role assignments, institutional settings and the approved backup-overdue day count. The contract does not specify that interval, so none is invented. Backup candidates are absent until configured.
5. Configure gateway IP/failed-request rate limits. SQL identity limiting and request bounds are implemented; global advisory serialization has not been load-tested for production scale.
6. Complete the separate team's Data API projections/policies and Matt's shared handlers. This work deliberately does not implement the 32 read operations or Matt's 41 Edge operations.
7. Academic interpretation requires confirmation: preview currently reports passing units carried by identity/pair rules and their units-weighted GWA; the contract does not fully specify the projected-GWA formula. Assignment eligibility currently requires an active/effective target and a nonfuture date after the previous start; lifecycle/future scheduling is not fully enumerated by the contract. These interpretations are documented rather than represented as verified policy.
8. Live old credit decisions are preserved and excluded from automatic source reuse. Resolve conflicting old decisions through explicit audited workflows. Historical report/cache consumers must integrate the supplied effective-dated history and revision markers.
9. Optional nested-definition combinations, every calendar edge and every failure variant are not exhaustively tested. See the SQL files for the scenarios actually executed. No claim of full production contract compliance is made beyond the verified local method/schema/status/role and workflow checks.

## Git contribution report

**16 implementation/test commits existed when this report was assembled**, followed by one final documentation commit containing this report, the updated checklist and `supabase/README.md`. The final response supplies that documentation commit's exact hash and the resulting total. No commit is empty or rewrites team history; every entry below is a real local commit. Imported base migrations are expressly attributed above.

### 1. `d05e4802e2ac753c927b64b59d15bdb7d1b9103b`

feat(db): integrate team schema and add Jerome workflow dependencies

Contribution: integrate team schema and add Jerome workflow dependencies.

Files:

- `docs/backend/jerome-implementation-plan.md`
- `supabase/migrations/20261009000100_v3_identity.sql`
- `supabase/migrations/20261009000110_v3_catalog.sql`
- `supabase/migrations/20261009000120_v3_curriculum.sql`
- `supabase/migrations/20261009000130_v3_assignments_terms.sql`
- `supabase/migrations/20261009000140_v3_enrollment.sql`
- `supabase/migrations/20261009000150_v3_credit_decisions.sql`
- `supabase/migrations/20261112000100_jerome_roles.sql`
- `supabase/migrations/20261112000200_jerome_dependencies.sql`

### 2. `76ceaa04e9b8638da543e496a8cfceb506a7b49b`

feat(edge): add pinned contract validation and secure request infrastructure

Contribution: add pinned contract validation and secure request infrastructure.

Files:

- `supabase/deno.json`
- `supabase/functions/_shared/contract.json`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/serve.ts`
- `supabase/migrations/20261112000300_jerome_infrastructure.sql`
- `supabase/migrations/20261112000400_jerome_contract.sql`
- `supabase/tests/bootstrap.sql`
- `supabase/tests/http.test.mjs`
- `supabase/tests/infrastructure.sql`
- `supabase/tools/snapshot-contract.cjs`
- `supabase/tsconfig.json`

### 3. `d7ccaa35ce12daf0894d8659509611936f302bff`

feat(catalog): implement atomic catalog writes and curriculum cloning

Contribution: implement atomic catalog writes and curriculum cloning.

Files:

- `supabase/functions/catalog/index.ts`
- `supabase/migrations/20261112000300_jerome_infrastructure.sql`
- `supabase/migrations/20261112000500_jerome_catalog.sql`
- `supabase/migrations/20261112000900_jerome_rpc.sql`
- `supabase/tests/10_catalog.sql`
- `supabase/tests/fixtures.sql`
- `supabase/tools/test-database.cjs`

### 4. `0f4a1675ddb68dfce1a76c9e8377c141f9429d18`

feat(terms): enforce department encoding closure and Admin overrides

Contribution: enforce department encoding closure and Admin overrides.

Files:

- `supabase/functions/school-terms/index.ts`
- `supabase/migrations/20261112000500_jerome_catalog.sql`
- `supabase/migrations/20261112000600_jerome_school_terms.sql`
- `supabase/tests/15_people.sql`
- `supabase/tests/20_school_terms.sql`

### 5. `fda3231d9ecc2b781724b2e762c837c8d628f0bc`

feat(students): implement credit decisions and atomic curriculum transfers

Contribution: implement credit decisions and atomic curriculum transfers.

Files:

- `supabase/functions/curriculum-transfers/index.ts`
- `supabase/functions/students/index.ts`
- `supabase/functions/students/jerome-routes.ts`
- `supabase/migrations/20261112000700_jerome_credits.sql`
- `supabase/migrations/20261112000750_jerome_curriculum.sql`
- `supabase/tests/25_student_setup.sql`
- `supabase/tests/30_credits.sql`
- `supabase/tests/40_curriculum.sql`

### 6. `fca55998e33e1e254a2edea8d2a30414cc8afeeb`

feat(notifications): evaluate scoped alerts and update owned read states

Contribution: evaluate scoped alerts and update owned read states.

Files:

- `supabase/functions/notifications/index.ts`
- `supabase/migrations/20261112000800_jerome_notifications.sql`
- `supabase/tests/50_notifications.sql`

### 7. `354630aa99f1154e2a1d8ef3fa36b578b72e36ec`

fix(security): seal RPC bypasses and verify rollback across all operations

Contribution: seal RPC bypasses and verify rollback across all operations.

Files:

- `supabase/config.toml`
- `supabase/migrations/20261112000700_jerome_credits.sql`
- `supabase/migrations/20261112000800_jerome_notifications.sql`
- `supabase/migrations/20261112000900_jerome_rpc.sql`
- `supabase/migrations/20261112001000_jerome_security.sql`
- `supabase/tests/45_transfer_rollback.sql`
- `supabase/tests/60_security.sql`
- `supabase/tests/contract.test.mjs`

### 8. `f91740ce0ed586e0fc4470672d35bef2a7f28491`

fix(auth): accept hosted publishable keys and reject malformed identifiers

Contribution: accept hosted publishable keys and reject malformed identifiers.

Files:

- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/serve.ts`
- `supabase/tests/http.test.mjs`

### 9. `43b60408fdd8b138550b726ae88996c9781a6a23`

test(credits): exercise concurrent writers and invalid academic sources

Contribution: exercise concurrent writers and invalid academic sources.

Files:

- `supabase/tests/35_credit_failures.sql`
- `supabase/tests/70_concurrency_setup.sql`
- `supabase/tests/concurrency.mjs`
- `supabase/tools/test-database.cjs`

### 10. `2a018e0e9546ec2cc98f31c0ff3e6cf06dba3cf8`

fix(catalog): support nested clone definitions and draft term edits

Contribution: support nested clone definitions and draft term edits.

Files:

- `supabase/migrations/20261112000500_jerome_catalog.sql`
- `supabase/tests/10_catalog.sql`

### 11. `20c2c7737adcd5200dd4802825840f635f6411a0`

fix(db): preserve zero-unit snapshots and attribute scoped audit roles

Contribution: preserve zero-unit snapshots and attribute scoped audit roles.

Files:

- `supabase/migrations/20261112000300_jerome_infrastructure.sql`
- `supabase/migrations/20261112000800_jerome_notifications.sql`
- `supabase/migrations/20261112000900_jerome_rpc.sql`
- `supabase/migrations/20261112001000_jerome_security.sql`
- `supabase/migrations/20261112001050_jerome_unit_snapshots.sql`
- `supabase/tests/36_zero_units.sql`
- `supabase/tests/60_security.sql`

### 12. `cbc8afff9ec0722996625e15747b4446cae59989`

fix(credits): prevent INC completion from duplicating live credit

Contribution: prevent INC completion from duplicating live credit.

Files:

- `supabase/migrations/20261112001000_jerome_security.sql`
- `supabase/tests/37_inc_credit_collision.sql`
- `supabase/tests/60_security.sql`

### 13. `fa741f51879064c12c34878dac42a9ef3f82336f`

fix(terms): audit department closure state against its own record

Contribution: audit department closure state against its own record.

Files:

- `supabase/migrations/20261112000600_jerome_school_terms.sql`
- `supabase/tests/20_school_terms.sql`

### 14. `2ed5cea95526520da25f9d13505e1a6c48df2377`

fix(credits): enforce Unicode-normalized outside source uniqueness

Contribution: enforce Unicode-normalized outside source uniqueness.

Files:

- `supabase/migrations/20261112001060_jerome_outside_keys.sql`
- `supabase/tests/38_unicode_outside.sql`
- `supabase/tools/generate-casefold.py`

### 15. `ce761faec7fbe5e3f75657492c97cbee514401f9`

test(contract): validate frozen baseline without changing the checkout

Contribution: validate frozen baseline without changing the checkout.

Files:

- `supabase/tools/check-pinned-contract.cjs`

### 16. `c13d0b3a8ec89c323d33a4d8f29ee4939d690bf1`

fix(validation): reject invalid clocks and sanitize numeric overflow

Contribution: reject invalid clocks and sanitize numeric overflow.

Files:

- `supabase/migrations/20261112000300_jerome_infrastructure.sql`
- `supabase/migrations/20261112000900_jerome_rpc.sql`
- `supabase/tests/10_catalog.sql`
- `supabase/tests/infrastructure.sql`

### Final documentation contribution

The final documentation commit records the reproducible commands, deployment/integration requirements, operation statuses, security limits and this verified contribution inventory. Its exact hash is supplied in the final response after Git creates it. Files: `supabase/README.md`, `docs/backend/jerome-implementation-plan.md`, `docs/backend/jerome-implementation-report.md`.

No implementation is deliberately left uncommitted. Ignored build output, pinned-check copies and the stopped disposable PostgreSQL cluster remain local test artifacts under ignored paths. No changes were pushed.
