# Student Academic Advising Information System (SAAIS)

A web-based academic advising system supporting three roles — **Student**, **Academic Adviser**, and **System Administrator** — for managing curriculum checklists, enrollment attempts, grades, adviser assignments, and advising documentation. Responsive across desktop and mobile.

**Project Managers:** Jomari Joseph A. Barrera · Kyle Anthony Nierras

Copyright © 2026 Jomari Joseph A. Barrera. All rights reserved. See [LICENSE.md](./LICENSE.md).

## Table of Contents

1. [Overview](#1-overview)
2. [Project Team](#2-project-team)
3. [Tech Stack](#3-tech-stack)
4. [Getting Started](#4-getting-started)
5. [Project Structure](#5-project-structure)
6. [Domain Rules & Business Logic](#6-domain-rules--business-logic)
7. [Data Model Reference](#7-data-model-reference)
8. [UI/UX Sitemap & Features](#8-uiux-sitemap--features)
9. [Design Details](#9-design-details)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Out of Scope](#11-out-of-scope)
12. [Assumptions & Decisions Log](#12-assumptions--decisions-log)
13. [Project Management & Contributing](#13-project-management--contributing)
14. [Deployment](#14-deployment)
15. [License](#15-license)
16. [Glossary](#16-glossary)
17. [Open Questions & Risks](#17-open-questions--risks)

---

## 1. Overview

SAAIS centralizes academic advising workflows: curriculum checklist tracking, enrollment attempt records, grade history, adviser-student assignment history, and advising documentation (notes/remarks). It replaces manual, paper- or spreadsheet-based advising records with a single structured, auditable source of truth.

**Project repository:** [Repository URL](https://github.com/csci153-saais-2026/saais-web)

Three roles are supported:

- **Student** — views own checklist, grades, GWA, and enrollment history.
- **Academic Adviser** — manages advisees, records enrollment attempts, notes, elective mappings, and equivalency decisions.
- **System Administrator** — manages accounts, programs, curricula, courses, and course offerings.

---

## 2. Project Team

| Role        | Name                          | GitHub Username   |
| ----------- | ----------------------------- | ----------------- |
| Team Leader | Lelis, Nietzchan Jake         | `@JakeNLelis`     |
| Member      | Bucol, Matthew Gerald A.      | `@Matt-cant-code` |
| Member      | Concoles, Cyril Jade M.       | `@con-cyse`       |
| Member      | Coting, Eulo Rod M.           | `@eking0723`      |
| Member      | Dumilon, John Earl Patrick G. | `@Htaruo`         |
| Member      | Flores, Raniel John B.        | `@username`       |
| Member      | Montera, Mhac Alester         | `@mteraaa`        |
| Member      | Polo, Marco Antonio P.        | `@Ryuuu00`        |
| Member      | Sta. Agata, Jerome Daniel S.  | `@staagatajd`     |
| Member      | Tan, Ron Nicolas              | `@username`       |

---

## 3. Tech Stack

| Layer                        | Choice                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                     | React 19 single-page app, built with Vite                                                                                         |
| Language                     | TypeScript                                                                                                                        |
| Routing                      | React Router (data router)                                                                                                        |
| Server state / data fetching | TanStack Query                                                                                                                    |
| Client state                 | React Context + `useReducer` — session/role, active advisee, and UI preferences; no third-party global store                      |
| Forms                        | React Hook Form + Zod resolver                                                                                                    |
| Styling                      | Tailwind CSS + shadcn/ui                                                                                                          |
| Backend                      | Supabase — PostgreSQL with Row Level Security, Auth                                                                               |
| Backend logic                | Supabase Edge Functions (Deno) — every operation needing a secret, a privileged write, or multi-step orchestration                |
| Scheduled jobs               | `pg_cron` / Supabase scheduled Edge Function invocation                                                                           |
| Auth                         | Supabase Auth — email/password + Google OAuth (institution-email-bound, enforced by an auth hook — see §9)                        |
| API contract                 | OpenAPI 3.1 — `contract/openapi.yaml`, hand-authored, the single source of truth for every endpoint the frontend may call         |
| API documentation            | Redoc — in-app `/docs` route (auth-gated outside development) plus a static bundle published by CI (`@redocly/cli`)               |
| Generated API client         | `openapi-typescript` (types) + `openapi-fetch` (typed client) — generated from the contract, never hand-edited                    |
| Contract enforcement         | `redocly lint`, a codegen-freshness check, and a PostgREST drift check — all run in CI                                            |
| API mocking                  | MSW (component/e2e tests) and Prism (runnable stub server) — lets screens be built against the contract before the backend exists |
| Database types               | `supabase gen types typescript` — database-side types, kept distinct from contract types                                          |
| Migrations                   | Supabase CLI, SQL migration files                                                                                                 |
| Validation                   | Zod on the client, mirroring the contract's request schemas; RLS, DB constraints, and Edge Function checks server-side            |
| Testing                      | Vitest + React Testing Library (unit/component), Playwright (e2e)                                                                 |
| CI/CD                        | GitHub Actions                                                                                                                    |
| Project Management           | GitHub Issues, Milestones, Projects (board), Pull Requests                                                                        |
| Hosting                      | Vercel (static SPA build) + hosted Supabase project (database/auth)                                                               |
| Node                         | 20.x (pin via `.nvmrc`)                                                                                                           |
| Package manager              | npm — one lockfile (`package-lock.json`); do not introduce a second package manager                                               |

### Contract-First Convention

There is no application server between the React app and Supabase — Supabase _is_ the backend. The frontend/backend boundary is therefore not a deployment boundary but a **contract**: `contract/openapi.yaml`.

The frontend never queries the database ad hoc. Every call it makes is an operation declared in the contract, and the typed client is generated from that file, so an endpoint that isn't in the contract cannot be called in a type-checking build. The contract covers two backend surfaces:

1. **PostgREST data endpoints** (`/rest/v1/<table>`) — the read and simple-write operations the app is entitled to make. Authorization is RLS, not client-side discipline.
2. **Edge Function endpoints** (`/functions/v1/<name>`) — anything that needs a secret, a privileged write, or a multi-step transaction (see [§9 API Contract](#9-design-details) for this project's full list).

Supabase auto-publishes a machine-generated OpenAPI description of PostgREST. **That is not the contract**: it exposes every column and filter on every table, changes silently with each migration, and carries no versioning. `contract/openapi.yaml` is the curated, reviewed subset the frontend is allowed to use; CI diffs the two so a migration that breaks a documented shape fails the build rather than the browser.

## 4. Getting Started

### Prerequisites

- Node.js 20.x (use the version in `.nvmrc`; `nvm use` if you have nvm installed)
- npm — the canonical package manager for this project; all commands below use `npm`. Commit only `package-lock.json`; do not introduce a second package manager.
- Docker (for local Supabase)
- Supabase CLI — install per the [official instructions](https://supabase.com/docs/guides/cli/getting-started) for your OS (Homebrew, Scoop, or direct binary; avoid the unsupported global npm install)
- A Supabase project (remote, for staging/production)
- A Google Cloud OAuth client (for SSO sign-in)

### Environment Variables

Create a `.env.local` file. This is a client-side bundle: **every `VITE_`-prefixed variable is compiled into JavaScript the browser downloads, so nothing secret may appear here.**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=            # publishable anon key; RLS is what protects the data
VITE_SITE_URL=                     # e.g. http://localhost:5173 — used for OAuth redirect URLs
```

Server-side secrets belong to Edge Functions, never to the app bundle, and are set through the Supabase CLI:

```bash
supabase secrets set SOME_PROVIDER_KEY=...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge Functions by the platform automatically — do not add them to `.env.local`. Google OAuth client ID/secret are configured in the Supabase Auth provider dashboard, not as app-level environment variables.

### Installation

```bash
git clone <repo-url>
cd saais
npm install
supabase login
supabase link --project-ref <project-ref>
```

### Local Development Database

```bash
supabase start                          # spins up local Postgres, Auth, Storage via Docker
supabase migration up                   # apply all migrations locally
supabase db seed                        # load supabase/seed.sql (sample programs, curricula, courses)
supabase gen types typescript --local > src/lib/supabase/database.types.ts
supabase functions serve                # run Edge Functions locally
```

Run `supabase gen types typescript` again after every schema-changing migration to keep the app's types in sync.

### Generating the API Client

The typed client is generated from the contract, not written by hand:

```bash
npm run contract:lint     # redocly lint contract/openapi.yaml
npm run contract:gen      # openapi-typescript → contract/generated/schema.d.ts
npm run contract:check    # fails if generated output is stale, or if PostgREST has drifted from the contract
npm run contract:docs     # build the static Redoc bundle
```

`contract/generated/` is committed so that a fresh clone type-checks without network access; `contract:check` in CI is what keeps it honest. Redoc is also served in-app at `/docs` while the dev server is running.

### Seed Data Specification

`supabase/seed.sql` should populate enough sample data to exercise every UI state and business rule without real student data:

- 1–2 sample Programs, each with a CurriculumVersion carrying its own `delinquency_threshold`.
- A prerequisite chain covering all three types (strict, co-requisite, recommended), including at least one course of each `repeatable_type` (`none`, `grade_replacement`, `additional_credit`).
- At least one `by_request` CourseOffering for a discontinued course, and one locked SchoolTerm with an active `override_flag`.
- Sample students covering: a lapsed INC (past its compliance deadline, unresolved), a `prerequisite_override` attempt, an active ElectiveMapping, a transfer EquivalencyDecision, a student above the curriculum's delinquency threshold, and an AdviserAssignment history with at least one reassignment (to exercise gap-free continuity).
- At least one Profile per role (`student`, `adviser`, `admin`), and one student with staff-only AdvisingNote/AttemptRemark entries.

### Pushing to a Remote/Staging Project

```bash
supabase db push
```

### Running the App

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

### Available Scripts

| Script                    | Purpose                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`             | Start the Vite dev server                                                        |
| `npm run build`           | Type-check and produce the production bundle                                     |
| `npm run preview`         | Serve the production bundle locally                                              |
| `npm run lint`            | ESLint                                                                           |
| `npm run typecheck`       | `tsc --noEmit`                                                                   |
| `npm run test`            | Unit/component tests (Vitest)                                                    |
| `npm run test:e2e`        | End-to-end tests (Playwright)                                                    |
| `npm run contract:lint`   | Lint `contract/openapi.yaml` (`redocly lint`)                                    |
| `npm run contract:gen`    | Regenerate the typed API client from the contract                                |
| `npm run contract:check`  | Fail if the generated client is stale or PostgREST has drifted from the contract |
| `npm run contract:docs`   | Build the static Redoc bundle                                                    |
| `npm run db:types`        | Regenerate Supabase database types                                               |
| `npm run functions:serve` | Run Edge Functions locally (`supabase functions serve`)                          |

### Troubleshooting

- **RLS denials during local dev**: confirm you're testing as an authenticated role (not the service role key, which bypasses RLS) — see [Data Access & RLS](#9-design-details).
- **OAuth redirect mismatch**: ensure `VITE_SITE_URL` and the Supabase Auth redirect URL list both match the environment you're testing in (local/preview/production).
- **404 on a deep link after deploy**: the SPA needs a catch-all rewrite to `index.html` (see [§14](#14-deployment)) — without it, only `/` resolves.
- **`contract:check` fails after a migration**: PostgREST's shape changed but `contract/openapi.yaml` wasn't updated. Update the contract, re-run `contract:gen`, and commit both.
- **Migration conflicts**: run `supabase migration list` to check for divergence between local and remote history before pushing.

## 5. Project Structure

```
contract/
  openapi.yaml         # THE contract — single source of truth for every callable endpoint
  redocly.yaml         # lint ruleset + Redoc theme config
  generated/           # openapi-typescript output (committed, CI-verified fresh, never hand-edited)
src/
  main.tsx             # app entry; mounts providers
  App.tsx              # router + provider composition
  routes/
    auth/              # login, invite-accept, password reset
    student/           # student portal routes
    adviser/           # adviser portal routes
    admin/             # admin portal routes
    docs/              # in-app Redoc viewer (auth-gated outside development)
  components/
    ui/                # shared primitives (buttons, modals, tables, badges)
    features/          # feature-specific components (checklist, enrollment form, etc.)
  context/             # React Context providers (see §9 State Management)
    SessionContext.tsx     # session, profile, role — the app-wide auth source of truth
    AdviseeContext.tsx     # the advisee currently being worked on, shared across adviser screens
    PreferencesContext.tsx # theme, table density, persisted UI preferences
  lib/
    api/               # openapi-fetch client bound to contract/generated: auth header, error mapping
    supabase/          # supabase-js browser client (auth only), generated database types
    validation/        # Zod schemas mirroring the contract's request bodies
  hooks/               # TanStack Query hooks, one per contract operation
supabase/
  migrations/          # SQL migration files
  functions/           # Edge Functions — each one an operation in contract/openapi.yaml
  seed.sql             # local/dev seed data
.github/
  workflows/           # GitHub Actions CI pipelines
  ISSUE_TEMPLATE/       # bug report / test-case issue templates
```

## 6. Domain Rules & Business Logic

### Users & Roles

- Three roles: student, academic adviser, system administrator.
- Accounts are **admin-provisioned only** — no public self-signup. An admin creates a profile with an institutional email and role; the user then sets a password via invite, or signs in with Google **only if the authenticated Google email exactly matches the pre-registered email**. Mismatches are rejected.
- An adviser can have 1+ advisees; a student has exactly 1 active adviser at all times — **zero-gap continuity is required**. Reassignment is atomic: the new assignment's start date coincides with the prior assignment's end date, enforced within a single transaction/trigger so a student is never left without an active adviser.
- Adviser-to-student assignments retain full dated history.
- Admins manage accounts, programs, curricula, courses, and offerings, but are not assigned advisees.
- Thesis advising is out of scope.

### Program & Curriculum

- A program has 1+ curriculum versions, each with an effectivity period.
- Each curriculum version belongs to exactly 1 program.
- A student is assigned to exactly 1 curriculum at a time; changes are tracked as dated history (transfer/shift events), never overwritten.
- A curriculum has 1+ terms (year level + term-within-year sequence); each term has 1+ courses.
- A course can appear in multiple curricula (many-to-many at the term level).
- Each curriculum defines its own delinquency threshold.
- Grading scale (1.00 best – 5.00 fail, passing ≤3.00) is fixed system-wide, discrete 0.25 increments.

### Courses

- Attributes: code, title, lecture hours, lab hours, units, status (active/discontinued), 0+ prerequisites.
- Course codes are never assumed equivalent across different codes.
- Prerequisite types: strict, co-requisite, recommended (advisory only).
- **Prerequisite enforcement is a soft check**: at enrollment, if a strict prerequisite isn't satisfied, the system shows a warning prompt to the adviser with **Continue** / **Cancel**. It does not hard-block. A Continue override is recorded on the attempt for audit purposes.
- `repeatable_type` distinguishes how a repeated course affects GWA/units: `none` (course cannot be retaken once passed), `grade_replacement` (only the applicable attempt per the rule in [Enrollment & Attempts](#enrollment--attempts) counts), or `additional_credit` (each passed attempt counts independently — see below).
- A curriculum term slot can be an elective slot, not tied to one fixed code.

### Elective Course Mapping (within a Curriculum)

- An adviser can manually map an enrolled course to an elective slot, even if codes differ.
- Recorded per student, against the specific attempt and slot — not a standing code-to-code rule.
- Distinct from curriculum-transfer equivalency (below).
- Revisable/reversible by an adviser; changes are audited.
- If the mapped course's units differ from the slot's nominal units, the checklist displays the actual units earned.

### Curriculum Equivalency (on Student Transfer)

- On transfer, an adviser may decide a passed old-curriculum course satisfies a specific new-curriculum course — strictly one-to-one.
- A passed course may have no equivalent; the student then takes the new course normally.
- Recorded per student: which attempt, which destination slot, which adviser, when.
- For discontinued required courses: an adviser may declare an equivalent course from another current curriculum, provided its units ≥ the original slot's units (alternative to a by-request offering).
- Checklist shows whether a slot was satisfied by direct attempt, transfer equivalency, discontinued-course equivalency, or elective mapping.
- Revocable/editable, audited.
- Uses the original passed attempt's grade/units for display; does not create a new attempt or re-trigger GWA recomputation in the destination curriculum.

### Terms & Course Offerings

- Curriculum term slot (positional) ≠ school term (calendar instance: school year + term type; natural key = school year + term type).
- A school term can be locked after grades finalize; edits outside an override process are blocked. Override _workflow_ is out of scope — only lock state plus an override flag/timestamp/actor are modeled.
- A course is offered in a term via a course-offering record (not assumed available every term).
- A course-offering can be flagged by-request (for discontinued courses still needed under an older curriculum).
- Section/instructor/schedule detail is out of scope.

### Enrollment & Attempts

- A student can be enrolled in 0+ school terms, 1+ courses per term.
- **Each attempt references a specific course-offering** (natural key: student + course-offering), not student + course + term independently.
- Each attempt may also reference the specific curriculum-term-course (checklist slot) it directly fulfills, distinguishing a "direct attempt" against a slot from an attempt that isn't tied to any curriculum requirement (e.g., a free elective outside the checklist). This reference is nullable and is distinct from — and does not replace — the separate ElectiveMapping and EquivalencyDecision records used for indirect slot satisfaction.
- Attempt status: Passed, Failed, Currently Enrolled, INC, DR, NA.
- Midterm and final grade fields; INC resolved later via a separate completion-grade record.
- **INC handling**: an INC has a compliance deadline (default: 1 year from the term incurred). If not resolved within that period, the attempt's `status` remains `INC` permanently — it is never auto-changed to `Failed`. Instead, **GWA computation** treats any INC past its compliance deadline as a grade of 5.00 for calculation purposes only. This is a computed rule evaluated at GWA-calculation time, not a stored status transition.
- A lapsed INC (past its compliance deadline) is likewise treated as failed units for the **delinquency flag** calculation, consistent with its GWA treatment.
- **Units-earned/GWA counting rule, by `repeatable_type`:**
  - **`none` / `grade_replacement`**: once a student has a Passed attempt, that **most recent Passed attempt** is what counts toward units earned/GWA — permanently, even if one or more Failed/other-status attempts occur _after_ that pass. A later failure never reverts an already-passed course back to failing for GWA purposes. If the course has never been passed, the most recent attempt (whatever its status) is what counts.
  - **`additional_credit`**: each Passed attempt counts **independently** toward units earned/GWA — the "latest passing attempt only" rule does not apply, since each successful repeat stacks credit rather than replacing a prior one.
  - All other attempts not selected by the rule above are retained for history only and do not affect units earned/GWA.
- Term/cumulative GWA are derived (unit-weighted), cached with a recompute trigger on grade change. Because a lapsed INC changes GWA purely due to elapsed time (not an explicit grade edit), any cached GWA value must also be invalidated/recomputed by a scheduled check — see [Design Details](#9-design-details).
- A delinquency flag is computed per student per term against the curriculum's threshold, using the failed-units definition above (explicit Failed status + lapsed INC).

### Advising & Documentation

- Advisers record dated, append-only, free-text general notes per student.
- Notes and attempt-level remarks are **staff-only** (adviser + admin) — not visible to the student.
- The checklist collates all remarks across every attempt of a course, ordered by term.
- A remark can attach to a checklist slot with no attempt yet.

### Audit & Integrity

- Audit trail for grade/record changes: INC completions, grade corrections, equivalency approvals, elective mapping changes, and prerequisite-warning overrides.
- Each entry: actor, timestamp, entity/record, field(s), old value, new value, optional reason.
- The audit log is append-only/immutable at the DB level.
- Structured records are the single source of truth; exports are read-only.

## 7. Data Model Reference

### Entity Glossary

| Entity                      | Purpose                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile                     | Base identity (linked 1:1 to `auth.users.id`), role, contact info                                                                                                 |
| AdviserAssignment           | Dated, gap-free history of adviser↔student pairing                                                                                                                |
| Program                     | Degree program                                                                                                                                                    |
| CurriculumVersion           | Versioned curriculum under a program, with effectivity period                                                                                                     |
| CurriculumTerm              | Positional term slot within a curriculum version                                                                                                                  |
| Course                      | Course catalog entry                                                                                                                                              |
| Prerequisite                | Course-to-course relationship with type                                                                                                                           |
| CurriculumTermCourse        | M:M link, term slots ↔ courses (the "checklist slot")                                                                                                             |
| StudentCurriculumAssignment | Dated history, student ↔ curriculum                                                                                                                               |
| ElectiveMapping             | Per-student mapping of an attempt to an elective slot                                                                                                             |
| EquivalencyDecision         | Per-student decision that a passed course satisfies a destination slot                                                                                            |
| SchoolTerm                  | Calendar instance (school year + term type), lock state                                                                                                           |
| CourseOffering              | Course-in-a-term record, by-request flag                                                                                                                          |
| Attempt                     | Enrollment attempt tied to a course-offering; optional FK to the checklist slot (CurriculumTermCourse) it directly fulfills; carries a prerequisite-override flag |
| INCResolution               | Completion grade record for a resolved INC (does not apply to lapsed/unresolved INCs, which are handled purely at GWA-calculation time)                           |
| AdvisingNote                | Append-only general note (staff-only visibility)                                                                                                                  |
| AttemptRemark               | Note scoped to an attempt or empty slot (staff-only)                                                                                                              |
| AuditLogEntry               | Immutable change record                                                                                                                                           |

### Field-Level Schema Sketch

This is a lightweight starting point for migration authoring, not final DDL — types, constraints, and indexes should be refined during actual schema implementation.

**Profile**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | equals `auth.users.id` |
| `role` | enum(`student`,`adviser`,`admin`) | not null; admin-set only, never self-editable |
| `email` | text, unique, not null | must match Google account exactly for SSO sign-in |
| `full_name` | text, not null | |
| `created_at`, `updated_at` | timestamptz | |

**AdviserAssignment**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `adviser_id` | uuid, FK → Profile, not null | |
| `student_id` | uuid, FK → Profile, not null | |
| `start_date` | date, not null | must equal prior row's `end_date` for this student (gap-free constraint) |
| `end_date` | date, nullable | null = currently active |
| `created_at` | timestamptz | |

**Program**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `code`, `name` | text, unique, not null | |

**CurriculumVersion**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `program_id` | uuid, FK → Program, not null | |
| `effective_start`, `effective_end` | date | `effective_end` nullable (open-ended) |
| `delinquency_threshold` | numeric, not null | curriculum-specific failed-units threshold |

**CurriculumTerm**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `curriculum_version_id` | uuid, FK → CurriculumVersion, not null | |
| `year_level`, `term_sequence` | int, not null | positional ordering within the curriculum |

**Course**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `code` | text, unique, not null | never assumed equivalent across different codes |
| `title` | text, not null | |
| `lecture_hours`, `lab_hours`, `units` | numeric, not null | |
| `status` | enum(`active`,`discontinued`) | |
| `repeatable_type` | enum(`none`,`grade_replacement`,`additional_credit`) | drives the units/GWA counting rule in §6 |

**Prerequisite**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `course_id` | uuid, FK → Course, not null | the course requiring the prerequisite |
| `prerequisite_course_id` | uuid, FK → Course, not null | |
| `type` | enum(`strict`,`co_requisite`,`recommended`) | only `strict` triggers the soft enrollment warning |

**CurriculumTermCourse** (the "checklist slot")
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `curriculum_term_id` | uuid, FK → CurriculumTerm, not null | |
| `course_id` | uuid, FK → Course, nullable | null when `is_elective_slot` is true (slot not tied to one fixed code) |
| `is_elective_slot` | boolean, not null | |
| `nominal_units` | numeric, not null | used to detect a units mismatch against an ElectiveMapping's actual course |

**StudentCurriculumAssignment**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `student_id` | uuid, FK → Profile, not null | |
| `curriculum_version_id` | uuid, FK → CurriculumVersion, not null | |
| `start_date` | date, not null | |
| `end_date` | date, nullable | null = current curriculum; a transfer/shift creates a new row rather than overwriting |
| `reason` | text, nullable | e.g. "transfer", "shift" |

**ElectiveMapping**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `attempt_id` | uuid, FK → Attempt, not null | |
| `curriculum_term_course_id` | uuid, FK → CurriculumTermCourse, not null | must be an elective slot |
| `mapped_by` | uuid, FK → Profile (adviser), not null | |
| `created_at`, `updated_at` | timestamptz | reversible/revisable; changes audited |

**EquivalencyDecision**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `attempt_id` | uuid, FK → Attempt, not null | the original passed attempt |
| `destination_curriculum_term_course_id` | uuid, FK → CurriculumTermCourse, not null | one-to-one |
| `decision_type` | enum(`transfer_equivalency`,`discontinued_course_equivalency`) | |
| `decided_by` | uuid, FK → Profile (adviser), not null | |
| `decided_at` | timestamptz, not null | revocable/editable, audited |

**SchoolTerm**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `school_year`, `term_type` | text, not null | natural key together |
| `is_locked` | boolean, not null, default false | set once grades finalize |
| `override_flag` | boolean, not null, default false | true while a lock override is in effect |
| `override_actor_id` | uuid, FK → Profile, nullable | who invoked the override |
| `override_at` | timestamptz, nullable | override _process_ is out of scope — state only |

**CourseOffering**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `school_term_id` | uuid, FK → SchoolTerm, not null | |
| `course_id` | uuid, FK → Course, not null | |
| `is_by_request` | boolean, not null, default false | for discontinued courses still needed under an older curriculum |

**Attempt**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `student_id` | uuid, FK → Profile, not null | |
| `course_offering_id` | uuid, FK → CourseOffering, not null | natural key: (student, course_offering) |
| `curriculum_term_course_id` | uuid, FK → CurriculumTermCourse, nullable | the checklist slot this attempt directly fulfills, if any |
| `status` | enum(`passed`,`failed`,`currently_enrolled`,`inc`,`dr`,`na`) | |
| `midterm_grade`, `final_grade` | numeric, nullable | discrete 0.25 increments, 1.00–5.00 |
| `inc_deadline` | date, nullable | set when `status = inc`; default 1 year from term incurred |
| `prerequisite_override` | boolean, not null, default false | true if a strict-prerequisite warning was overridden (Continue) |
| `created_at`, `updated_at` | timestamptz | |

**INCResolution**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `attempt_id` | uuid, FK → Attempt, unique, not null | 1:0-or-1 with Attempt; only for attempts resolved before their deadline |
| `completion_grade` | numeric, not null | |
| `resolved_at` | timestamptz, not null | |

**AdvisingNote**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `student_id` | uuid, FK → Profile, not null | |
| `authored_by` | uuid, FK → Profile (adviser/admin), not null | |
| `body_text` | text, not null | append-only; staff-only visibility |
| `created_at` | timestamptz, not null | |

**AttemptRemark**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `attempt_id` | uuid, FK → Attempt, nullable | nullable to allow a remark on an empty checklist slot |
| `curriculum_term_course_id` | uuid, FK → CurriculumTermCourse, nullable | used when `attempt_id` is null |
| `authored_by` | uuid, FK → Profile (adviser/admin), not null | |
| `body_text` | text, not null | staff-only visibility |
| `created_at` | timestamptz, not null | |

**AuditLogEntry**
| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `actor_id` | uuid, FK → Profile, nullable | null for system-triggered events (e.g. scheduled INC-lapse recompute) |
| `action` | text, not null | e.g. `attempt.prerequisite_override`, `equivalency.revoked` |
| `entity_type` | text, not null | |
| `entity_id` | uuid, not null | |
| `old_value`, `new_value` | jsonb, nullable | |
| `reason` | text, nullable | |
| `created_at` | timestamptz, not null | append-only/immutable at the DB level |

### Relationship / Cardinality Summary

| Entity A             | Relationship                 | Entity B                                             | Cardinality                                           |
| -------------------- | ---------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Adviser              | advises (dated, gap-free)    | Student                                              | 1 : many; student has exactly 1 active adviser always |
| Program              | has                          | CurriculumVersion                                    | 1 : many                                              |
| CurriculumVersion    | contains                     | CurriculumTerm                                       | 1 : many                                              |
| CurriculumTerm       | contains                     | Course                                               | many : many                                           |
| Student              | assigned to (dated)          | CurriculumVersion                                    | 1 active at a time                                    |
| Course               | has                          | Prerequisite(Course)                                 | many : many, typed                                    |
| SchoolTerm           | offers                       | Course                                               | many : many (via CourseOffering)                      |
| Student              | attempts                     | CourseOffering                                       | many : many (via Attempt), unique per pair            |
| Attempt              | directly fulfills (optional) | CurriculumTermCourse                                 | many : 0 or 1                                         |
| Attempt              | resolved by                  | INCResolution                                        | 1 : 0 or 1                                            |
| Student              | has                          | ElectiveMapping / EquivalencyDecision / AdvisingNote | 1 : many                                              |
| Attempt              | has                          | AttemptRemark                                        | 1 : many                                              |
| Any auditable entity | generates                    | AuditLogEntry                                        | 1 : many                                              |

## 8. UI/UX Sitemap & Features

Client-side routes, resolved by React Router; parameters use `:param` syntax.

### Public / Auth

| Route                                 | Purpose                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/login`                              | Email/password or "Sign in with Google" (must match registered email)                                   |
| `/invite/:token`                      | Set initial password from an admin-issued invite                                                        |
| `/forgot-password`, `/reset-password` | Password recovery                                                                                       |
| `/docs`                               | Redoc view of `contract/openapi.yaml`; open in development, authenticated-only in deployed environments |

### Student Portal

| Route                         | Features                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/student/dashboard`          | Current adviser, cumulative GWA, delinquency flag, quick links                                              |
| `/student/checklist`          | Curriculum checklist — status per slot (direct / equivalency / discontinued-equivalency / elective mapping) |
| `/student/grades`             | Term-by-term grades, term & cumulative GWA                                                                  |
| `/student/enrollment-history` | All attempts across terms                                                                                   |
| `/student/profile`            | Account/contact info                                                                                        |

### Adviser Portal

| Route                             | Features                                                                |
| --------------------------------- | ----------------------------------------------------------------------- |
| `/adviser/dashboard`              | Advisee list, delinquency flags, INC-deadline alerts                    |
| `/adviser/advisees`               | Search/filter current & past advisees                                   |
| `/adviser/advisees/:id`           | Full student view: checklist, grades, history, notes                    |
| `/adviser/advisees/:id/notes`     | Add/view advising notes & attempt remarks                               |
| `/adviser/advisees/:id/checklist` | Manage elective mappings & equivalency decisions                        |
| `/adviser/enrollment/new`         | Record an enrollment attempt (prerequisite warning prompt on soft-fail) |
| `/adviser/reassignment`           | Initiate adviser reassignment (gap-free enforced)                       |

### Admin Portal

| Route                     | Features                                                       |
| ------------------------- | -------------------------------------------------------------- |
| `/admin/dashboard`        | System-wide stats                                              |
| `/admin/accounts`         | Provision/manage accounts & roles, send invites                |
| `/admin/programs`         | CRUD programs                                                  |
| `/admin/curricula`        | CRUD curriculum versions, terms, delinquency thresholds        |
| `/admin/courses`          | CRUD courses, prerequisites, repeatable flags                  |
| `/admin/course-offerings` | Manage school terms, offerings, by-request flags, term locking |
| `/admin/audit-log`        | Read-only audit trail viewer                                   |

## 9. Design Details

### Architecture

A React SPA talks to Supabase over HTTP, and only through operations declared in `contract/openapi.yaml`. Read-heavy views (checklist, grades, dashboards) are TanStack Query reads against PostgREST endpoints, where RLS decides what the caller may see. Writes fall into two classes:

- **Simple, single-row writes** (advising notes, profile edits) go straight to PostgREST; RLS and DB constraints are the whole enforcement story.
- **Writes with invariants the client cannot be trusted to uphold** — recording an enrollment attempt with its prerequisite-override audit, adviser reassignment's zero-gap transaction, equivalency decisions — go through an Edge Function, so the rule lives on the server side of the contract.

There is no application server of our own. Anything that would previously have justified one (a secret, a privileged write, a multi-statement transaction) is an Edge Function, and every Edge Function is a documented operation in the contract.

### API Contract (OpenAPI 3.1 + Redoc)

**Source of truth.** `contract/openapi.yaml` is hand-authored and reviewed like code. It is the interface between whoever builds screens and whoever builds schema/functions, and it is written _before_ either side is implemented.

**Layout and versioning.** Supabase fixes the path prefixes (`/rest/v1`, `/functions/v1`), so the contract carries its own semver in `info.version`. A breaking change (removing a field, tightening a type, changing an operation's meaning) requires a major bump plus a migration note in the PR description; additive changes are minor.

**Operations.** Every operation has a stable `operationId` in camelCase (`listAdviseeAttempts`, `recordEnrollmentAttempt`, `reassignAdviser`), which is what the generated client's method names derive from. Operations are grouped by portal with `x-tagGroups` (Student / Adviser / Admin / Auth), so Redoc's sidebar mirrors the app's structure.

**Auth.** One `bearerAuth` security scheme (the Supabase JWT) is declared globally. The handful of unauthenticated operations opt out explicitly with `security: []`. The contract also documents, per operation, _which role can succeed_ — RLS is the enforcement, but an undocumented 403 is a contract bug.

**Error model.** A single `Error` schema matching PostgREST's `{ code, message, details, hint }`. Edge Functions must return the same shape and the same status codes, so `src/lib/api` has exactly one error path regardless of which surface answered.

**Edge Function operations for this system:**

| Operation                  | Endpoint                                   | Why it can't be a plain PostgREST write                                                                                              |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `recordEnrollmentAttempt`  | `POST /functions/v1/enrollment-attempts`   | Runs the prerequisite soft check and, on a Continue override, writes the attempt and its audit record together                       |
| `reassignAdviser`          | `POST /functions/v1/adviser-reassignment`  | Closes the outgoing assignment and opens the incoming one in one transaction, so zero-gap continuity can never be violated mid-write |
| `applyEquivalencyDecision` | `POST /functions/v1/equivalency-decisions` | Writes the decision and remaps the affected checklist slot atomically                                                                |
| `recomputeLapsedIncGwa`    | `POST /functions/v1/recompute-lapsed-inc`  | Scheduled (not user-facing); invoked by `pg_cron` with the service role to invalidate GWA caches whose INC deadline has newly passed |

**Generated client.** `openapi-typescript` produces `contract/generated/schema.d.ts`; `openapi-fetch` wraps it into a typed client in `src/lib/api`, which attaches the current access token and normalizes errors. Query hooks in `src/hooks` are thin wrappers, one per operation. Nothing else in the app imports `supabase-js` for data access — the Supabase SDK is used only for auth.

**Drift detection.** After migrations run in CI, `contract:check` fetches the live auto-generated PostgREST description and compares it against every PostgREST path the contract documents. A migration that renames a column or changes a type fails CI, rather than surfacing as a runtime error in the browser.

**Documentation.** Redoc renders the contract two ways, deliberately: an in-app `/docs` route (the `redoc` React component, so contributors read the same spec the running build uses — gated behind an authenticated session outside development), and a static bundle built by `redocly build-docs` in CI, published as a build artifact so the contract is browsable without running anything.

### Auth & Session Flow

Supabase Auth handles both email/password and Google OAuth through the `supabase-js` browser client, with the session persisted in browser storage and refreshed automatically. `SessionContext` subscribes to `onAuthStateChange`, resolves the signed-in user's `profiles` row once, and exposes `{ session, profile, role, status }` to the whole tree; route guards and the API client both read from it rather than re-fetching.

There is no self-service registration. **The institutional-email match is enforced server-side, not in the SPA**: a Supabase Auth hook (`before user created`) rejects any sign-in whose Google email has no exactly-matching pre-registered `profiles.email`. This placement matters — a React bundle can be modified by whoever runs it, so a client-side email comparison would be advisory only. The client's job is limited to rendering the resulting rejection message ("contact an administrator").

### Data Access & RLS

RLS policies key off `profiles.role` plus relationship tables:

- **Student**: SELECT only own records.
- **Adviser**: SELECT/INSERT/UPDATE only for currently (and, read-only, historically) assigned advisees, via `AdviserAssignment`.
- **Admin**: full access to management tables (programs, curricula, courses, offerings, accounts); notes/remarks remain staff-scoped (adviser + admin), never student-visible.

### GWA Caching & Time-Based Recompute

Cached term/cumulative GWA values are recomputed via a DB trigger whenever a grade is inserted or updated. However, a lapsed INC changes a student's effective GWA purely due to elapsed time, with no corresponding row edit to trigger a recompute. To keep cached values correct, the `recomputeLapsedIncGwa` Edge Function runs daily on a `pg_cron` schedule, checking for attempts whose INC compliance deadline has newly passed and invalidating/recomputing the affected cached GWA and delinquency-flag values. Live (uncached) GWA reads should always apply the deadline check directly, regardless of cache state. This job is not reachable from the SPA — it is documented in the contract for completeness but marked with a service-role-only security requirement.

### Adviser Reassignment Integrity

Zero-gap continuity is enforced at the database level: a constraint/trigger on `AdviserAssignment` rejects any insert that would leave a student without a currently-active assignment (i.e., a new row's start date must not create a gap after the prior row's end date). The `reassignAdviser` Edge Function performs the close-and-open as a single transaction so the two writes can never be partially applied, but the DB constraint remains the backstop — this is not left to application-layer discipline alone.

### Component & Styling Conventions

Tailwind CSS utilities with shadcn/ui as the component base. Shared primitives (buttons, modals, tables, status badges for Passed/Failed/INC/DR/NA and delinquency flags) are centralized in `src/components/ui/`.

### Responsive Design

Mobile-first breakpoints; checklist/grade tables collapse to stacked card layouts below `md`; primary navigation collapses to a drawer/hamburger on mobile.

### Accessibility

Target WCAG 2.1 AA: semantic HTML, keyboard-navigable forms/modals, sufficient color contrast for status badges (not color alone to distinguish Passed/Failed/INC), and accessible labels on all form inputs.

### State Management

Three tiers, kept deliberately separate:

- **Server state — TanStack Query.** Everything that lives in Postgres: checklists, grades, advisee lists, audit entries. Query keys are derived from the contract's `operationId` plus its parameters, so cache invalidation after a mutation is mechanical rather than guesswork. Nothing fetched from the server is copied into Context.
- **Client state — React Context.** Cross-cutting state that isn't server data and would otherwise be prop-drilled through most of the tree:
  - `SessionContext` — session, `profile`, and `role`, populated once from `onAuthStateChange`. Route guards, the API client's auth header, and every role-conditional render read from here. This is the app's single auth source of truth.
  - `AdviseeContext` — the advisee currently being worked on, shared by the checklist, grades, notes, and enrollment screens under `/adviser/advisees/:id` so they don't each re-resolve it.
  - `PreferencesContext` — theme, table density, and similar persisted UI preferences.
    Each provider is its own file with a `use…()` hook that throws when consumed outside its provider, and each holds a narrow value; a single app-wide "store" context is deliberately avoided, since it would re-render the whole tree on any change. Providers whose value is an object memoize it, and those with non-trivial transitions use `useReducer` rather than a scatter of `useState` setters.
- **Local state — `useState`.** Forms, modals, and the prerequisite-warning dialog.

No third-party global state library is used; Query plus Context covers both tiers without one.

### Error Handling & Validation

Zod schemas in `src/lib/validation` mirror the contract's request bodies and back the React Hook Form resolvers, so a payload rejected by the server is normally caught before it is sent. They are a UX affordance, not the enforcement layer — RLS, DB constraints, and Edge Function checks are.

The generated client normalizes every failure into the contract's single `Error` shape, so components handle one error type whether it came from PostgREST or an Edge Function. The prerequisite check runs as a pre-submit call to `recordEnrollmentAttempt` in dry-run mode, returning a warning payload that is rendered as a confirm/cancel modal; choosing Continue re-issues the call with the override flag, and the Edge Function writes the attempt and its audit record together.

### Migration & Naming Conventions

Supabase CLI migrations: `YYYYMMDDHHMMSS_description.sql`, one logical change per file, snake_case identifiers throughout.

## 10. Non-Functional Requirements

- Designed for typical mid-size university scale (thousands of students, tens of thousands of attempts/year) absent other guidance.
- Audit log and historical assignment/curriculum records are retained indefinitely, no auto-purge.
- GWA/delinquency caching uses a recompute trigger on grade insert/update, plus the scheduled deadline check described in §9.
- **Backup/recovery**: relies on the hosted Supabase project's built-in backup tier; no custom backup pipeline planned for v1.
- **Browser support**: latest two versions of Chrome, Firefox, Safari, and Edge; no legacy browser support required.

## 11. Out of Scope

- Thesis advising.
- Section/instructor/schedule-level offering detail.
- Term-lock override workflow mechanics (state only, not process).
- Adviser advisee-capacity limits.
- Public self-service account registration.

## 12. Assumptions & Decisions Log

1. **Adviser gap tolerance** — zero-gap continuity required; enforced by a DB-level constraint/trigger, not application discipline alone.
2. **Prerequisite enforcement** — soft warning with Continue/Cancel prompt; override is audited.
3. **INC lapse** — status stays `INC` permanently; GWA computation and the delinquency flag both treat a lapsed INC as 5.00/failed-units, evaluated at calculation time (not a stored status change). Cached GWA values need a scheduled deadline check to stay correct (§9).
4. Equivalency/mapping slots use the original attempt's grade/units and don't re-trigger GWA recompute.
5. Notes/remarks are staff-only, never student-visible.
6. Attempt natural key is (student, course-offering); an optional FK links an attempt to the specific checklist slot it directly fulfills.
7. Accounts are admin-provisioned only; Google SSO requires an exact email match to the pre-registered profile, enforced by a Supabase Auth hook rather than a client-side check, since a React bundle cannot enforce anything against whoever runs it.
8. Tech stack confirmed: React (Vite SPA), TypeScript, React Router, TanStack Query, React Context for client state, Tailwind CSS + shadcn/ui, Zod, Supabase (Postgres/RLS/Auth/Edge Functions), Vitest/RTL + Playwright, GitHub Actions, Vercel (static) + hosted Supabase.
9. All project management (Issues, Milestones, PRs, reviews, CI) happens on GitHub — see §13.
10. License: All Rights Reserved, owned by Jomari Joseph A. Barrera, with an explicit contributor-assignment clause for project contributions — see §15 and [LICENSE.md](./LICENSE.md).
11. **Repeatable-course GWA rule** — `repeatable_type` of `none`/`grade_replacement` counts only the most recent Passed attempt toward units earned/GWA (a later failure never un-counts an earlier pass); `additional_credit` counts every Passed attempt independently — see §6 and §7.
12. Data Privacy Act (RA 10173) compliance applies to this system's grade, enrollment, and advising-note data — see §15.9.
13. **Contract-first backend boundary** — there is no application server; Supabase is the backend, and the frontend/backend interface is `contract/openapi.yaml` (OpenAPI 3.1), documented with Redoc. The frontend may only call operations declared there, and calls through a client generated from it. The auto-generated PostgREST spec is treated as a drift-detection input, never as the contract itself — see §3 and §9.
14. **Server-side logic placement** — anything that needs a secret, a privileged write, or a multi-statement transaction is a Supabase Edge Function and a documented contract operation; plain reads and single-row writes go directly to PostgREST under RLS — see §9.

## 13. Project Management & Contributing

This system is built by a cross-functional project team. Everything below assumes developers, QA engineers, product/project management, and other delivery members sharing one repository, and the conventions exist to keep the team from blocking itself.

All project management lives on GitHub: Issues, Milestones, Projects (board), Pull Requests, and reviews. There is no external PM tool.

### Team Structure & Parallel Work

The contract is what makes parallel delivery possible. `contract/openapi.yaml` is written and agreed **first**, before either half is implemented — after that, the frontend team can build every screen against a mock while the backend team implements schema, RLS, and Edge Functions, and neither waits on the other. Integration is then a base-URL change rather than a week of surprises.

A workable delivery split, adapted to the team's size:

| Responsibility        | Owns                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Contract**          | `contract/openapi.yaml` — the operations, schemas, and error responses. Reviewed by both sides before either builds against it |
| **Frontend**          | `src/` — routes, components, Context providers, Query hooks, and the generated client wrapper                                  |
| **Backend**           | `supabase/` — migrations, RLS policies, Edge Functions                                                                         |
| **Quality Assurance** | Test strategy, test-case issues, automated end-to-end coverage, and release verification                                       |
| **Project Manager**   | Milestones, the issue board, delivery coordination, and the tiebreak on contract disputes                                      |

Two rules keep the split honest:

- **A contract change is a shared decision.** A PR that edits `contract/openapi.yaml` needs approval from someone on the _other_ side of it — the frontend cannot quietly add a field it wants, and the backend cannot quietly drop one the UI renders. Ordinary PRs that only consume the contract need the standard single approval.
- **Nobody hand-edits generated output.** `contract/generated/` is regenerated with `npm run contract:gen`; a PR that edits it by hand fails `contract:check` in CI.

Project contributions are documented through commits, pull requests, issue history, test evidence, and review records — see §15.4.

### Test Cases as Issues

End-to-end test cases are raised as GitHub Issues by Quality Assurance in coordination with the Project Manager. Each test-case issue specifies the scenario, steps, and expected result (e.g., "Adviser attempts to enroll a student without a satisfied strict prerequisite — warning modal should appear with Continue/Cancel"). A developer or QA engineer implements the corresponding Playwright test referencing the issue number, and the PR that adds it must close that issue.

### Milestones

Milestones group issues by development phase/sprint (e.g., "Enrollment & Attempts," "Adviser Reassignment"). Every issue should be assigned to a milestone before work starts.

### Branching & Pull Requests

- Branch naming: `feature/<short-description>`, `fix/<short-description>`, tied to an issue number where applicable (e.g., `feature/12-inc-lapse-gwa`).
- **Commit messages follow [Conventional Commits](https://www.conventionalcommits.org)**: `type(scope): imperative description`, using `feat`, `fix`, `docs`, `refactor`, `test`, `style`, or `chore`. A change that breaks existing callers takes a `!` before the colon — `feat(contract)!: rename the load endpoint` — which is how a breaking contract change announces itself in the log rather than in someone's failing build.
- Every PR must reference the issue(s) it addresses and describe what changed.
- **1 required reviewer approval** before merging, enforced via GitHub branch protection on `main`.
- CI (see below) must pass before a PR is eligible for merge.

### CI (GitHub Actions)

Workflows in `.github/workflows/` run on every PR:

- Contract lint (`npm run contract:lint`)
- Contract check (`npm run contract:check`) — fails if the committed generated client is stale, or if the live PostgREST schema has drifted from what the contract documents
- Lint (`npm run lint`)
- Typecheck (`npm run typecheck`)
- Unit/component tests (`npm run test`)
- Build (`npm run build`)
- E2E tests (`npm run test:e2e`) against a Supabase instance seeded via `supabase/seed.sql`, run with an authenticated test role (not the service role key) so RLS is actually exercised.

The contract jobs run first: a PR that changes schema without updating `contract/openapi.yaml` fails before anything else runs, which is the point of the boundary.

On merge to `main`, a separate deploy workflow applies pending migrations to staging (`supabase db push`), deploys Edge Functions (`supabase functions deploy`), publishes the static Redoc bundle (`npm run contract:docs`) as a build artifact, and then promotes the Vercel deployment.

## 14. Deployment

- Frontend is a static bundle (`npm run build`) hosted on Vercel; database, auth, and Edge Functions live in a hosted Supabase project.
- Vercel needs a catch-all rewrite to `index.html` (`vercel.json`) so React Router can resolve deep links; without it only `/` is reachable.
- GitHub Actions applies `supabase migration up`/`db push` against a staging project, then `supabase functions deploy`, before promoting to production.
- `VITE_`-prefixed variables are configured per-environment in Vercel project settings (Preview/Production). They are compiled into the client bundle and are therefore public by construction — Edge Function secrets are set separately with `supabase secrets set` and never appear in Vercel.
- The static Redoc bundle is published per environment alongside the app, so the deployed contract is always browsable at a stable URL.

## 15. License

**Student Academic Advising Information System (SAAIS)**

Copyright © 2026 Jomari Joseph A. Barrera. All rights reserved.

### 14.1 Ownership

This software, including its source code, database schema, documentation, and associated design materials (collectively, the "Work"), is the intellectual property of Jomari Joseph A. Barrera ("the Owner"). The Work is developed under the Owner's direction by the project team. Any code, documentation, designs, test assets, or other materials contributed to the Work are project contributions and are assigned to the Owner as set out in Section 14.3.

### 14.2 Grant of Rights

No rights are granted to any person or entity to use, copy, modify, merge, publish, distribute, sublicense, or sell copies of the Work, in whole or in part, except:

(a) as expressly and separately authorized in writing by the Owner; or
(b) as necessary for an authorized Contributor (as defined in Section 14.3) to perform assigned project work under the Owner's direction.

If this repository or any part of the Work is made visible to the public or to external parties, such access is provided, if at all, for viewing purposes only. No license to reuse, redistribute, or create derivative works is granted by that access.

### 14.3 Contributors

"Contributor" means any developer, QA engineer, designer, project manager, or other authorized project team member who submits code, documentation, test assets, designs, or other materials to the Work.

By contributing, a Contributor:

(a) assigns to the Owner all right, title, and interest in and to their contribution, to the fullest extent permitted by law, or, where such assignment is not legally permitted, grants the Owner a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, and incorporate the contribution into the Work without restriction;
(b) retains the right to identify their participation in the project for personal portfolio or resume purposes, but may not distribute, publish, or otherwise reuse the Work's source code itself without the Owner's separate written permission;
(c) acknowledges that this assignment is made in connection with project work, without expectation of compensation, royalty, or ongoing rights beyond the attribution described in Section 14.4.

### 14.4 Attribution

The Owner may, at their discretion, credit Contributors for their work. Attribution does not confer any ownership, licensing, or distribution rights on a Contributor.

### 14.5 Relationship to Applicable Agreements

This license states the Owner's claim of ownership and the terms on which the Owner makes the Work available. It does not attempt to override, and remains subject to, any applicable employment, contractor, client, or intellectual-property agreement. Where such an agreement conflicts with this license, that agreement shall govern to the extent required by law.

### 14.6 No Warranty

THE WORK IS PROVIDED "AS IS," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE OWNER BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE WORK OR ITS USE.

### 14.7 Governing Law

This license is governed by and construed in accordance with the laws of the Republic of the Philippines.

### 14.8 Contact

For permission requests or licensing inquiries, contact Jomari Joseph A. Barrera.

### 14.9 Data Privacy Notice

This system processes personal information about students — including grades, enrollment history, and advising notes — as part of its core function. Its handling of that data should be reviewed against the Philippines' Data Privacy Act of 2012 (RA 10173) and any applicable organizational data-privacy policy before any deployment involving real student data. This document does not constitute legal advice; independent legal/compliance review is recommended.

_This is not legal advice. Independent legal review is recommended, particularly regarding how this license interacts with applicable intellectual-property agreements and data privacy law._

## 16. Glossary

| Term                                                                 | Meaning                                                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Direct attempt**                                                   | An Attempt whose optional FK points to the specific checklist slot (CurriculumTermCourse) it fulfills.                                                                               |
| **Elective Mapping**                                                 | A per-student, per-attempt mapping of an enrolled course to an elective slot, even if codes differ; distinct from curriculum equivalency.                                            |
| **Equivalency Decision**                                             | A per-student, one-to-one decision that a passed old-curriculum (or discontinued-course) attempt satisfies a specific destination-curriculum slot.                                   |
| **Lapsed INC**                                                       | An INC attempt past its compliance deadline (default 1 year); status stays `INC` permanently, but is treated as 5.00/failed-units for GWA and delinquency calculation purposes only. |
| **Gap-free continuity**                                              | The rule that a student always has exactly one active adviser; a reassignment's start date must coincide with the prior assignment's end date, enforced at the DB level.             |
| **Delinquency flag**                                                 | A per-student, per-term flag computed against the student's curriculum-specific failed-units threshold (explicit Failed status + lapsed INC).                                        |
| **Grade-replacement retake** (`repeatable_type = grade_replacement`) | A repeat where the most recent Passed attempt counts toward units/GWA, permanently superseding any later failures.                                                                   |
| **Additional-credit retake** (`repeatable_type = additional_credit`) | A repeat where each Passed attempt counts independently toward units/GWA (e.g. variable-topic or practicum-style courses).                                                           |

## 17. Open Questions & Risks

Consolidated from flagged items across the document — resolve before or during early implementation:

1. **Additional-credit retake cap** (§6, §7) — no maximum number of additional-credit repeats or cumulative units is specified; confirm whether one is needed, or whether it's bounded only by the curriculum's own unit totals.
2. **Term-lock override process** (§6, §11) — only lock state plus an override flag/timestamp/actor are modeled; the actual approval workflow for invoking an override is out of scope and needs a decision before implementation.
3. **Adviser advisee-capacity limits** (§11) — confirmed out of scope for v1; revisit if adviser workload becomes a practical issue.
4. **Retroactive effect of revoking an ElectiveMapping/EquivalencyDecision** (§6) — confirm whether revocation retroactively recomputes past-term GWA/checklist status or only takes effect going forward.
5. **Grade-replacement vs. additional-credit rule** (§6, §12 item 11) — the two-branch counting rule reflects the intended policy as clarified during design; confirm it matches the organization's registrar practice before implementation.
6. **Data Privacy Act (RA 10173) compliance review** (§15.9) — required before any deployment involving real student data; not yet conducted.
7. **PostgREST drift-check strictness** (§9) — the CI comparison between `contract/openapi.yaml` and the live auto-generated PostgREST description needs a decided policy on additive changes: a new column is harmless to the frontend but is still drift. Confirm whether the check fails on any difference or only on ones affecting documented operations.
8. **Contract review in a small group** (§13) — the both-sides-approval rule for contract changes assumes the group is large enough that the frontend and backend halves are different people. Confirm how it degrades for a two-person group, where one member may own both sides and the rule becomes self-approval.
