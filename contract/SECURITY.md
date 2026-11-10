# Contract security review

The 0.2.0 contract reconciles the supplied Gemini review of 0.1.0 with the finalized advising workflow. It is a target API specification, not an implementation or evidence that a deployed Supabase project is secure.

The 0.2.1 revision adds the Supabase project `apikey` alongside the user bearer JWT, preserves pre-login invitation redemption, and documents SDK-managed email/password and Google PKCE authentication in [SUPABASE-AUTH.md](SUPABASE-AUTH.md). It also accommodates upstream gateway authentication errors. No Supabase configuration is applied.

The 0.3.0 revision reconciles the contract with the finalized SRS and full-stack prototype across all six assignable roles (`student`, `adviser`, `department_head`, `department_staff`, `dean`, `admin`) and multi-role assignments (`role_assignment`). It adds departmental/catalog management operations (including empty-draft curriculum/term creation and unreferenced faculty, department, program, and curriculum version deletion), curriculum cloning and pair equivalences, bulk adviser reassignment, unassigned-student invitation/import support, open-term attempt removal, the VSU `DR` midterm outcome rule (`midterm_status=dr`), curriculum transfer endorsement/decision, outside-credit recording and revocation, student grade-flag submission/resolution, CSV batch imports (preview and commit), advising note archive state and student read visibility (B9), typed event-driven and idempotent scheduled notifications (`POST /functions/v1/notifications/evaluate-alerts`), role-scoped student roster (`GET /functions/v1/students`) and cohort/grade-distribution reports, department-scoped term encoding closure (`/rest/v1/department_term_encoding`), department-scoped system settings and backup metadata, pre-session invitation preview/decline and authenticated resend/revoke lifecycle management, and read/report/export audit events.

| Finding | Contract correction |
| --- | --- |
| Client-supplied term override audit fields | A separate admin override operation accepts only `enabled`; the authenticated actor and timestamp are server-derived. |
| Shared profile mutation permissions | Account updates are admin-only, with closed request schemas. Department Head and Department Staff provisioning via `POST /functions/v1/auth/invite` (and `resend-invite` / `revoke-invite`) is scoped strictly to `student`, `adviser`, and `department_staff` accounts within their own department (`admin`, `dean`, and `department_head` grants remain Admin-only). Students cannot author, archive or edit advising notes and have no raw table writes; their only writes are the allowlisted self-service actions (raising grade flags, updating/removing their own profile photo with 2 MB PNG/JPEG validation, marking notifications read, and logging read/export events). |
| Missing role and assignment boundaries | Every operation specifies `x-required-roles` and an access scope. Current-adviser writes and historical-adviser reads are distinct requirements. Safe display names (`adviser_name`, `author_name`, `actor_name`, `dean_name`, `department_head_name`) and `enrolled_student_count` are projected server-side so non-Admin roles never need broad `/rest/v1/profile` or student-assignment directory access. |
| Unbounded collection reads | Collection reads declare bounded pagination; table reads allowlist flat projections and ordering. Gateway enforcement remains mandatory. |
| Loose operator filters | UUID filters use `eq.UUID`, `neq.UUID`, or `in.(UUID,...)`, with at most 50 IDs. Operator-prefixed strings are not plain UUIDs. |
| Missing error coverage | Authenticated reads specify 403; transactional ID-based operations specify 404/conflicts. Hidden or absent PostgREST collection rows return an empty collection rather than a fabricated 404. |
| Missing academic transactions | Explicit operations cover assignments, recording/correcting grades, prerequisite grade correction, INC completion, plans, elective mapping, equivalency, notes and remarks. |
| Raw writes bypass business rules | Public `/rest/v1` operations are read-only. Writes use authenticated server operations with atomic validation and audit requirements. Auth-lifecycle audit events (`sign_in_succeeded`, `login_rejected`, `password_changed`) are server/Auth-hook owned and rejected on client-called `/functions/v1/audit/view-event`. |

The supplied audit predates some existing pagination, role metadata and assignment/credit schemas. Those findings were rechecked against the current contract rather than treated as proof of runtime vulnerabilities. Its suggested student profile edits, prerequisite approval queue and global course equivalencies conflict with the confirmed requirements and were not adopted.

## Workflow requirements

- Record Grades enrolls a new offering or fills missing grades. An existing populated grade rejects the entire request, including identical re-entry; corrections use Grades instead. New enrollment with a midterm requires confirmation.
- Only the final grade determines Passed (`<= 3.0`) or Failed (`> 3.0`). Weighted GWA can have values between the quarter-step grades accepted for individual courses.
- Prerequisite clearance corrects the original failed prerequisite to a passing final grade with a reason. It affects GWA and downstream clearance; it does not assign grades to dependent courses or require admin approval.
- First INC completion remains allowed in a locked term before its deadline. Later corrections obey the term lock. Original INC and the effective Passed/Failed result remain distinct. Default deadlines use the actual term end date.
- College/department relationships derive through the student's assigned curriculum/program. Account provisioning includes the required adviser/program/curriculum for students and college for advisers.
- Selected school terms include both semesters and Summer/Midyear. Offering search prioritizes the student's program before cross-program courses.
- Students can read their own advising notes (`GET /rest/v1/advising_note` under B9) and perform allowlisted self-service actions (raising grade flags, updating/removing their own profile photo, marking notifications read, and logging read/export events), but cannot author or archive advising notes, read internal course/slot remarks (`attempt_remark`), read internal reasons or audit snapshots, or access the adviser-only AI assistant. Staff reads and writes must respect current, historical, departmental, or college assignment scope.
- Elective mapping and equivalency use student-owned attempts and actual source units. Equivalency requires a passed source; discontinued-course replacement uses another current curriculum. Source/destination exclusivity and revocation history must be enforced atomically.

## Required production enforcement

`x-required-roles`, access-scope metadata, bounds and descriptions document requirements. They do not authorize requests or configure PostgREST. The [OpenAPI specification](https://spec.openapis.org/oas/v3.1.0) defines the contract format; implementation must independently validate it.

Before deployment, configure verified authentication, database grants/RLS, current-assignment checks, server-owned audit fields, transaction/revision/term-lock guards, request/query caps, pagination caps and rate limits. Deny direct academic table writes to browser roles. Keep service credentials outside the SPA. Projection defaults in OpenAPI are not automatically applied by [PostgREST](https://postgrest.org/en/v12/references/api/tables_views.html); private-column reads require an explicit safe projection and matching column grants or secure views. Supabase documents the role of [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) in restricting exposed data.

This is a breaking contract revision: clients must replace raw table mutations with the documented Edge Function routes. The schema files remain a separate, uncommitted delivery. No Edge Function, database migration or production configuration is deployed by these changes.

## Verification

Run `npm run contract:lint`, `npm run contract:security`, `npm run contract:gen` and `npm run contract:docs`. CI also checks that generated types match the committed specification. The security checks inspect the real bundled contract for role boundaries, closed write bodies, actor spoofing fields, bounded reads, query/projection syntax and grade/INC operation separation. They do not replace deployed authorization or transaction tests.
