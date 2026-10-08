# Software Requirements Specification — SAAIS

## 1. Purpose, authority and scope

SAAIS is a production Student Academic Advising Information System for one institution. It helps administrators manage academic structures and accounts, advisers manage assigned students, and students view their own records. It records advising enrollment and grades; it does not perform registrar enrollment.

The UI reference is `mockup/prototype.html` and the assets it actually loads. Unused artboards and older generators are not requirements sources. Explicit user decisions recorded during requirements discovery override prototype defects. `README.md` provides technical context only where it agrees with this specification. Browser-only mockup storage, scripted assistant replies and role switches are demonstrations, not production implementations.

The separate enrollment system, student emails requesting enrollment approval, and adviser email replies remain outside SAAIS. After approving enrollment externally, an adviser records the approved courses here. Routine actions do not require administrator approval.

## 2. Production architecture and technical requirements

| Area | Required approach |
| --- | --- |
| Frontend | React SPA, TypeScript, Vite; React Router data router with route-level lazy loading. |
| Server state | TanStack Query for reads, mutation state, invalidation and caching. Database records remain authoritative. |
| Client state | React Context/useReducer for session and transient UI state. Production grades, notes, assignments and plans must not depend on browser memory/localStorage. |
| Forms and interface | React Hook Form + Zod; Tailwind CSS + shadcn/ui, preserving the prototype's forest/gold/cream visual identity and responsive hierarchy. |
| Backend | Hosted Supabase PostgreSQL, Auth and Row Level Security. Server checks enforce ownership, roles, term locks and grade-entry rules. |
| Privileged/invariant-preserving writes | Supabase Edge Functions with database transactions or transactional database functions; every public operation described by OpenAPI. |
| API boundary | Hand-authored OpenAPI 3.1; `openapi-typescript` + `openapi-fetch`; contract linting, generated-client freshness and schema drift checks in CI. |
| Documentation | Repository `docs/` contains maintained developer documentation; `docs/openapi/openapi.yaml` is the intended canonical API specification. During migration, the existing `contract/openapi.yaml` must be relocated with its consumers rather than duplicated as a second authority. |
| Documentation route | A lazy-loaded `src` route at `/docs` renders explicitly selected documentation from the repository `docs/` folder. `/docs/openapi` renders the canonical API specification through Redoc. Content is included by the Vite build; private notes, secrets and arbitrary repository files must not be published automatically. Auth required outside development. CI also builds a static API documentation artifact. |
| Delivery and checks | npm, GitHub Actions, Vitest/React Testing Library and Playwright; Vercel static SPA hosting plus hosted Supabase. Typecheck, production build and local preview are required before delivery of major app changes. |
| Deployment | SPA fallback rewrites for deep links; no-cache HTML; immutable caching for hashed assets. Client environment variables are public `VITE_` values. Secrets and service-role credentials remain server-only. |

## 3. Authentication, accounts and organizational hierarchy

| ID | Requirement |
| --- | --- |
| FR-AUTH-01 | Exactly three roles: `student`, `adviser`, `admin`. |
| FR-AUTH-02 | Accounts are admin-provisioned only; no public registration. |
| FR-AUTH-03 | Admin provisions institutional email, role and profile information. A student receives a program, matching curriculum and active adviser. An adviser receives a college assignment. Student department and college are derived from the program, not independently edited. Admin accounts do not require a student program or adviser college assignment. |
| FR-AUTH-04 | A provisioned user sets an initial password through a validated, expiring `/invite/:token` link. |
| FR-AUTH-05 | Email/password login at `/login`. |
| FR-AUTH-06 | Google sign-in succeeds only when the authenticated Google email exactly matches a provisioned profile email. |
| FR-AUTH-07 | Email matching and provisioning checks are enforced server-side; unmatched users receive a contact-an-administrator message. |
| FR-AUTH-08 | `/forgot-password` and `/reset-password` provide token-validated password recovery. |
| FR-AUTH-09 | Students read their own records only. Advisers read/write current assigned advisees and have strictly read-only access to historic advisees. Admins manage institutional data and staff-visible records. Notes and remarks never appear in student views or student-accessible API responses. |
| FR-AUTH-10 | Session context exposes session, profile, role and loading/auth status as the shared source for route guards and API calls. RLS/server authorization remains authoritative. |
| FR-AUTH-11 | Only admins assign roles; users cannot promote themselves. |
| FR-AUTH-12 | `/student/profile` shows the student's read-only identity, contact information, program, derived department/college and academic assignments. Corrections are admin-managed. |
| FR-AUTH-13 | Authenticated users can change their password in Settings, verifying the current password and confirming the replacement. Production password storage is handled by Supabase Auth. |
| FR-ORG-01 | A College/Faculty has departments; each Department belongs to exactly one College, and each Program belongs to exactly one Department. Course administration is assigned to a Department. |
| FR-ORG-02 | An adviser belongs to a College. Student program determines the student's Department and College. These relationships must remain consistent after program/curriculum changes. |

## 4. Administration: accounts, programs and curricula

| ID | Requirement |
| --- | --- |
| FR-ADM-01 | `/admin/accounts` provisions/manages accounts, roles, invitations and organizational assignments. Student provisioning includes one active adviser and one matching curriculum. |
| FR-ADM-02 | `/admin/dashboard` shows system-wide statistics and recent activity. |
| FR-ADM-03 | `/admin/programs` supports CRUD of programs with unique code and name, a required `department_id`, and derived College. |
| FR-ADM-04 | `/admin/curricula` manages program curriculum versions, effective start/end dates, required units, status and version-specific delinquency threshold. |
| FR-ADM-05 | Each Program retains at least one CurriculumVersion; each version belongs to exactly one Program. |
| FR-ADM-06 | CurriculumTerms contain year level and term sequence; each curriculum retains at least one term, and each term at least one requirement slot. |
| FR-ADM-07 | A course may appear in multiple curricula through distinct CurriculumTermCourse slots. |
| FR-ADM-08 | Each curriculum defines its own delinquency threshold. |
| FR-ADM-09 | A student has exactly one active curriculum. Transfers/shifts close the prior dated assignment and create a new dated assignment with a reason; no history overwrite. Student program and derived organization change consistently. |
| FR-ADM-10 | Admin CRUD of Colleges/Faculties with unique names. |
| FR-ADM-11 | Admin CRUD of Departments with unique names and a required parent College. |
| FR-ADM-12 | Accounts support search, role, College and Department filters. Programs support search, status, College and Department filters. Courses support Department filtering. These are combinable filters; an adviser without a department remains discoverable by College and role. |
| FR-ADM-13 | Records used by academic history cannot be destructively deleted; archive, discontinue or close them where applicable. Required last-child records and assignment continuity are protected server-side. |

## 5. Courses, grading scale, school terms and offerings

| ID | Requirement |
| --- | --- |
| FR-CRS-01 | `/admin/courses` supports CRUD of courses: unique code, title, required administering Department, lecture/lab hours, units, active/discontinued status and repeat policy (`none`, `grade_replacement`, `additional_credit`). |
| FR-CRS-02 | Different course codes never imply equivalence. Equivalency is an explicit student-specific decision. |
| FR-CRS-03 | Prerequisites have `strict`, `co_requisite` or `recommended` type. Strict prerequisites determine clearance; other types are advisory and do not prevent recording. |
| FR-CRS-04 | Grades use 1.00–5.00 in discrete 0.25 increments. A final or completion grade of 3.00 or lower is Passed; greater than 3.00 is Failed. Midterm grades do not determine final status or GWA. |
| FR-CRS-05 | `/admin/course-offerings` manages school terms, uniquely identified by school year and term type, with an admin-entered actual term end date, lock state and admin override flag, actor and timestamp. |
| FR-CRS-06 | Locked terms block enrollment, initial grade entry, grade/status corrections and prerequisite-grade overrides unless an authorized admin term override applies. **Exception: an unresolved INC may be completed before its deadline even when its term is locked.** Editing an existing INC completion is a correction and obeys the lock. |
| FR-CRS-07 | Every CourseOffering references a school term and course and indicates whether it is by request. Availability must be explicit; courses are not assumed offered every term. |
| FR-CRS-08 | Discontinued required courses may have by-request offerings for older curricula. |
| FR-CRS-09 | Curriculum terms are positional requirements, distinct from calendar school terms. Elective slots may have no fixed course and carry nominal units. |
| FR-CRS-10 | School-term types are 1st Semester, 2nd Semester and Summer/Midyear. UI labels may use Summer/Midyear while stored term type is normalized consistently. |

## 6. Record grades: enrollment and first-time grade entry

The Record grades tab records courses already approved in the institution's separate enrollment process. It also records missing grades. It never edits an existing grade value.

| ID | Requirement |
| --- | --- |
| FR-ENR-01 | `/adviser/enrollment/new` records an attempt for the selected student and offering. Within the student's six-tab view, `/adviser/advisees/:id/record-grades` presents the same Record grades workflow with explicit student context. Enrollment/grade writes are declared contract operations and transactionally enforced server-side. |
| FR-ENR-02 | One Attempt per student + course offering. Retakes use another offering and preserve all earlier attempts. |
| FR-ENR-03 | An attempt may directly fulfill one matching curriculum slot; this optional link is distinct from elective mapping and equivalency. |
| FR-ENR-04 | Attempts carry status (`passed`, `failed`, `currently_enrolled`, `inc`, `dr`, `na`), optional midterm/final grades, INC deadline when applicable, timestamps and audited correction/override provenance. |
| FR-ENR-05 | A student may have no enrollment records or records in multiple school terms, with one or more courses per recorded term. |
| FR-ENR-06 | The Record grades form includes a school-term selector, a searchable course offering, optional midterm grade and optional final grade. School-term choices include 1st Semester, 2nd Semester and Summer/Midyear, with locked terms clearly labeled. Search is restricted to offerings in the selected school term, without a separate catalog selector; courses in the student’s program/curriculum appear first, followed by all other/cross-program courses. Offering labels include their school term to distinguish repeated offerings; the selected offering must belong to the selected school term and its applicable lock is enforced. Changing school term clears the selected offering, grades and derived previews to prevent recording against a stale selection. Display the derived direct curriculum slot as borderless, full-width reference text labeled “Direct curriculum slot,” without “auto-generated.” Cross-program records may be unattached to a curriculum slot pending an explicit mapping/equivalency. |
| FR-ENR-07 | Both grades blank on a new offering records Currently Enrolled. Both blank on an existing attempt rejects the duplicate with an already-enrolled message and performs no write. |
| FR-ENR-08 | A new enrollment with a midterm grade requires a confirmation modal explaining that it will enroll the student and record the supplied grades. Cancel performs no write. |
| FR-ENR-09 | A supplied final grade determines Passed/Failed immediately; no final grade means Currently Enrolled. For example midterm 5.00 + final 3.00 is Passed, and final 3.25 is Failed. |
| FR-ENR-10 | For an existing ordinary enrollment, blank inputs leave stored grades unchanged and empty stored grade fields may be filled. Supplying any already-populated grade field, even the identical value, rejects the **entire submission**, including other new fields. The message directs the adviser to Grades. An existing completion grade also counts as an existing final result. INC is handled through Grades. |
| FR-ENR-11 | Example: existing midterm 2.00/final empty + submitted midterm blank/final 1.75 saves the final. Submitting midterm 2.00/final 1.75 rejects both fields. No partial save. |
| FR-ENR-12 | On unsatisfied strict prerequisites, show the missing prerequisites and a path to Grades. Do not silently clear them or record a direct enrollment-only bypass. A failed prerequisite can be cleared by the grade-correction workflow below. |
| FR-ENR-13 | Only the current adviser may record attempts or initial grades; historical advisers cannot mutate records. Validate offering membership, duplicate keys, grade increments, term lock and preconditions again at commit time to prevent race-condition overwrites. |

## 7. Grades, corrections, dropping and prerequisite clearance

| ID | Requirement |
| --- | --- |
| FR-GRD-01 | `/adviser/advisees/:id/grades` shows school terms newest first, then term grades and GWA. Student Grades uses the same chronological order and student-safe data. |
| FR-GRD-02 | The current adviser may correct grades/status, including DR or NA, in Grades when the term is editable. Corrections retain actor, reason, timestamp and old/new values in audit history. Passed/Failed derives from the final grade, not midterm. |
| FR-GRD-03 | Dropping means changing a course attempt to DR; it does not remove the student from the advisee roster. Advisers may correct/reverse course statuses through Grades subject to lock and INC rules. Registrar enrollment is unaffected. |
| FR-GRD-04 | To override a failed prerequisite, the adviser must enter a **passing replacement final grade for that original prerequisite attempt** and a reason. It is not a grade for the dependent course and does not require admin approval. |
| FR-GRD-05 | A prerequisite-grade override updates the original final grade and Passed status atomically with its audit entry, recomputes GWA/standing, and clears the prerequisite for all downstream courses. The student sees the new grade; staff-only reasons are not exposed as advising notes. Original values remain in audit history. |
| FR-GRD-06 | A failed prerequisite remains unfulfilled until a passing retake, valid equivalency, or authorized passing grade correction clears it. There is no fabricated course-code equivalence or automatic pass. |

## 8. INC, GWA and delinquency

| ID | Requirement |
| --- | --- |
| FR-GWA-01 | INC has a compliance deadline, default one calendar year after the admin-entered actual end date of the school term incurred. Fixed semester-end dates must not be assumed; changing a term’s end date affects defaults for future INC entries without silently rewriting existing recorded deadlines. |
| FR-GWA-02 | INC completion before/on its deadline creates one unique INCResolution with completion grade and resolved timestamp. Completion is permitted in a locked term as the explicit exception above. |
| FR-GWA-03 | An unresolved lapsed INC retains stored INC status permanently; no automatic transition to Failed. Completion after its deadline is rejected. |
| FR-GWA-04 | Lapsed INC counts as 5.00 for GWA calculations only and as failed units for delinquency. These are read-time rules, not stored grade/status replacements. |
| FR-GWA-05 | Completed INC displays **Passed** for completion grade ≤3.00 or **Failed** for grade >3.00 across Grades, History, checklist and dashboards. Display the original completion grade/provenance; do not show INC/Resolved as the current result. Keep the original INC attempt and its separate completion record for history. |
| FR-GWA-06 | For `none`/`grade_replacement`, once passed, the most recent passing attempt counts toward units/GWA permanently; later failure does not undo it. If never passed, the latest attempt counts. Additional-credit passes count independently. Select attempts by chronological school-term order, never by data-entry order. All other attempts are history-only. |
| FR-GWA-07 | Term/cumulative GWA is unit-weighted using final/completion results only. Midterm grades never affect GWA. Cached values recompute after initial final entry, final corrections, prerequisite-grade overrides and INC completion/correction. |
| FR-GWA-08 | A service-role-only daily scheduled recomputation applies newly lapsed INC deadlines to caches and delinquency. SPA users cannot invoke this maintenance operation. Uncached reads always apply deadline rules. |
| FR-GWA-09 | Delinquency is computed per student/school term using failed and lapsed-INC units against the applicable curriculum threshold. |

## 9. Checklist, elective mapping, equivalency and shift preview

| ID | Requirement |
| --- | --- |
| FR-CHK-01 | The interactive checklist groups requirements by curriculum year/term, supports status filtering, and shows requirement, required/earned units, effective status and satisfaction source. Students see their own safe read-only checklist. |
| FR-CHK-02 | Staff checklist offers current-adviser mapping/equivalency controls, exception provenance and term-ordered remarks. Historical advisers see these read-only. |
| FR-ELM-01 | The current adviser maps one student's specific enrolled attempt to a specific elective slot, including a different course code. |
| FR-ELM-02 | ElectiveMapping stores student, attempt, elective curriculum slot and mapping actor/timestamps; it is not a standing code-to-code rule. A required course slot is not an elective destination. |
| FR-ELM-03 | Elective mapping is separate from transfer/discontinued equivalency. |
| FR-ELM-04 | Mappings are editable/revocable with audited history and no admin approval. |
| FR-ELM-05 | Earned/displayed units come from the actual passed source course, not a manually reduced credit amount. A nominal-unit difference is visible without inventing additional earned credit. |
| FR-EQV-01 | The current adviser may apply one-to-one equivalency from a passed source attempt to one destination requirement, atomically and with audit. |
| FR-EQV-02 | A passed course without an approved equivalent does not fulfill a differently coded requirement. |
| FR-EQV-03 | Store student, original passed attempt, destination slot, transfer/discontinued decision type, deciding actor, timestamp and reason. |
| FR-EQV-04 | A discontinued-course equivalent must be a passed source from **another current curriculum**, with source units at least the destination's required units. Check current curriculum effectivity and course membership. By-request enrollment remains an alternative. |
| FR-EQV-05 | Checklist satisfaction source is Direct, Transfer equivalency, Discontinued equivalency or Elective mapping. |
| FR-EQV-06 | Decisions are editable/revocable and audited without admin approval; preserve source attempts. |
| FR-EQV-07 | Use original grade/units; equivalency creates no new attempt and does not independently change GWA. Prevent one source being counted as multiple one-to-one decisions or overwriting a satisfied destination. |
| FR-ADV-14 | Checklist includes Curriculum Shift Preview. Selecting a target program/curriculum projects carried units, lost units and GWA without writing assignments, attempts, mappings or approvals. Automatic matches use course identity only; possible elective/equivalency decisions are explicitly identified for adviser review. Applying a real shift remains an admin curriculum-assignment action. |

## 10. Adviser workspace, recommendations and AI

| ID | Requirement |
| --- | --- |
| FR-ADV-01 | A student has exactly one active adviser. An adviser may have multiple advisees. Admins are not assigned advisees. |
| FR-ADV-02 | Adviser assignments preserve dated history. |
| FR-ADV-03 | `/adviser/reassignment` transfers current advisees atomically with identical previous end/new start dates; no gap or multiple active advisers. Server constraints enforce continuity. No separate admin approval is required. |
| FR-ADV-04 | Admin provisioning supplies the initial adviser; current advisers may reassign their own advisees to another eligible active adviser. Historical access becomes strictly read-only. |
| FR-ADV-05 | Adviser dashboard shows assigned advisees, delinquency flags, INC deadlines and relevant recent activity. |
| FR-ADV-06 | `/adviser/advisees` supports current/past views, search and standing filters. |
| FR-ADV-07 | `/adviser/advisees/:id` contains exactly six tabs: **Overview, Advising, Checklist, Grades, Record grades, History**. No Notes or Documents tab. |
| FR-ADV-08 | Advising integrates recommendations, immediately visible recent internal notes, note entry/view-all and adviser-only AI chat. |
| FR-ADV-09 | Recommendations cover curriculum terms through **one term beyond the furthest term with a recorded attempt**. Offer exactly three term-type choices: 1st Semester, 2nd Semester, Summer/Midyear; display the associated school year and use that actual school term's offerings. |
| FR-ADV-10 | Recommend eligible unfulfilled requirements and mandatory failed/lapsed-INC retakes. The student chooses retake timing; unmet prerequisite-dependent courses remain excluded. Exclude completed and currently enrolled requirements, unavailable courses and unmet strict prerequisites. Elective recommendations identify actual offered courses, not unenrollable empty slots. |
| FR-ADV-11 | Rows show course code/title, units, Why recommended and applicable Elective, By request and Retake badges. Approved prerequisite-grade corrections count as clearance through the updated passed record. Co-requisite/recommended warnings remain advisory. |
| FR-ADV-12 | The current adviser multi-selects courses and saves a **student-specific, school-term-specific plan**. Plans persist in the database across reloads, appear on the student's dashboard, can be revised by the current adviser, and do not create enrollment attempts or modify registrar data. |
| FR-ADV-13 | Production AI gives record-grounded suggestions using the authorized student's grades, cleared prerequisites, offerings and degree requirements. Only advisers may access it. It displays a permanent verification notice and never autonomously writes academic records, grades or enrollments. Provider credentials and access checks are server-side. The mockup may clearly label simulated replies. |
| FR-ADV-15 | Historical advisers cannot add/remove plans, write notes, record/correct grades, map courses or mutate assignments, even through direct API calls. |

## 11. Internal notes and remarks

| ID | Requirement |
| --- | --- |
| FR-NTE-01 | Advising displays recent dated append-only general notes immediately, with entry and View all controls. Save student, author, body and timestamp. |
| FR-NTE-02 | Staff can add remarks to a course attempt or curriculum slot, including an empty slot without an attempt. |
| FR-NTE-03 | Notes and remarks are staff-only, never student-visible. Enforce this in queries, API projections and RLS, not only hidden UI. |
| FR-NTE-04 | Checklist collates remarks across the course's attempts by school term, with timestamps as a tie-breaker. Back-entered records do not change academic chronology. |

## 12. Student views and production routes

| ID | Requirement |
| --- | --- |
| FR-STU-01 | `/student/dashboard`: current adviser, GWA, earned units, standing/delinquency, INC alerts, saved term-specific recommendations and quick links. |
| FR-STU-02 | `/student/checklist`: read-only interactive filters, effective slot status and satisfaction provenance without internal notes/remarks. |
| FR-STU-03 | `/student/grades`: newest terms first, midterm/final/completion grades, term/cumulative GWA and effective Passed/Failed results. Prerequisite-grade corrections are visible. |
| FR-STU-04 | `/student/enrollment-history`: all attempts, retakes and effective outcomes across terms. |
| FR-STU-05 | Students cannot edit grades, select their own role/adviser/curriculum, persist adviser plans or access AI/internal notes. |

Production paths retain existing SRS routes. Advisee record URLs include the student ID: `/adviser/advisees/:id`, `/adviser/advisees/:id/advising`, `/checklist`, `/grades`, `/record-grades` and `/history` under the same prefix. `/adviser/enrollment/new` remains an enrollment entry route with explicit selected-student context. `/settings` handles password changes. Prototype hash routes are demonstration navigation and do not dictate production URL syntax.

## 13. Audit, security and non-functional requirements

| ID | Requirement |
| --- | --- |
| FR-AUD-01 | Audit account/assignment changes, enrollment/initial grades, corrections/drops, prerequisite-grade overrides, INC completion/correction, mappings/equivalency creation/edit/revoke, term overrides and plan changes. |
| FR-AUD-02 | Each audit entry has actor (nullable for scheduled system actions), action, entity type/ID, old/new values, reason where required and timestamp. |
| FR-AUD-03 | Audit is append-only/immutable at the database level; `/admin/audit-log` is read-only with search, details and CSV export. |
| FR-AUD-04 | Structured records are authoritative. Exports and print views do not modify academic data. |
| FR-DOC-01 | Maintain developer documentation in `docs/` and API documentation in its own `docs/openapi/` subtree. A `src` documentation route renders curated maintained content; the OpenAPI viewer and CI artifact read the same canonical specification. |
| NFR-01 | Support thousands of students and tens of thousands of attempts/year; paginate/index large views and scope reads to authorized records. |
| NFR-02 | Audit and historical adviser/curriculum assignments are retained indefinitely, with no automatic purge. |
| NFR-03 | Recompute/invalidate caches after relevant grade mutations and daily INC checks. Successful writes refresh dependent grades, checklist, recommendations, GWA and standing. |
| NFR-04 | Use the chosen hosted Supabase backup tier; document recovery and verify restoration before production use. |
| NFR-05 | Support latest two versions of Chrome, Firefox, Safari and Edge. |
| NFR-06 | Responsive desktop/mobile layouts; checklist/grade tables become stacked cards below medium breakpoint, and navigation becomes a keyboard-operable drawer. |
| NFR-07 | Target WCAG 2.1 AA: semantic HTML, labels, keyboard/focus handling, accessible dialogs, readable contrast and textual status labels. |
| NFR-08 | Complete the required Philippine student-data privacy/compliance review before real-data deployment. |
| NFR-09 | Validate server-side and use atomic commits for multi-field grade entry, overrides and assignments. Rejected/failed requests have no partial writes. |
| NFR-10 | Provide pending/error/empty states, actionable validation messages and protection against duplicate submissions; an error must not falsely report a saved record. |
| NFR-11 | Keep sensitive API keys out of the SPA and documentation artifacts. Authenticated routes, RLS and staff-only projections are mandatory production controls. |

## 14. Explicit exclusions

| ID | Excluded item |
| --- | --- |
| OOS-01 | Thesis advising workflows. Thesis courses may exist in the curriculum/catalog as ordinary academic requirements. |
| OOS-02 | Registrar enrollment integration, external approval-email integration, section capacity, timetable/classroom/instructor scheduling and autonomous AI enrollment. Display-only section labels do not model scheduling. |
| OOS-03 | A separate term-lock approval workflow. Only admin-set lock/override state is modeled. INC completion is the documented lock exception. |
| OOS-04 | Adviser capacity limits. |
| OOS-05 | Public self-registration and student self-editing of academic records. |
| OOS-06 | Admin approval for routine adviser actions, including prerequisite-grade overrides. |

## 15. Required acceptance scenarios

1. Admin provisions a student with program/curriculum/adviser; department/College are derived. Adviser account requires College. Role and College/Department filters work together.
2. Blank grades create one enrollment. Repeating it rejects the duplicate without a new attempt or audit write.
3. New enrollment with a midterm opens confirmation. Cancel writes nothing. Midterm 5.00/final 3.00 produces Passed; final 3.25 produces Failed.
4. Existing midterm 2.00/final empty accepts blank midterm/final 1.75. Resubmitting populated midterm 2.00 with the final rejects the whole request and directs the adviser to Grades.
5. Correcting a failed prerequisite to a passing grade requires a reason, no admin approval, updates student-visible grades/GWA and clears downstream recommendations. A locked prerequisite term rejects the correction.
6. Locked terms block ordinary enrollment and grade/status changes. Unexpired INC completion remains permitted; completion 3.00 displays Passed and 3.25 displays Failed. Lapsed unresolved INC remains INC and counts as 5.00 only in calculations.
7. Latest semesters appear first. Back-entered older attempts/remarks do not replace the academically most recent passing attempt or reorder terms incorrectly.
8. Failed requirements remain retake candidates inside the confirmed horizon; students choose timing. Recommendations honor the selected actual offering term and display applicable badges.
9. Plans survive reload, retain student and school term, and appear on the student's dashboard without enrolling them. Historical advisers cannot mutate them.
10. Notes appear immediately in Advising, with no separate Notes tab; students cannot retrieve them or access AI.
11. Elective mapping targets only elective slots and shows actual units. Discontinued equivalency rejects sources without another current curriculum membership.
12. Shift preview changes projected results only; compare all persistent tables before/after to prove no academic write.
13. Cross-program offerings can be recorded while registrar enrollment and external approval emails remain outside SAAIS.
14. Deep links refresh successfully in production; documentation routes load curated `docs/` content and the canonical OpenAPI specification without exposing private files.
