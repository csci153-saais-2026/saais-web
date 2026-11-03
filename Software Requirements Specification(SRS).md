# Software Requirements Specification — SAAIS

## 1. Purpose, authority and scope

SAAIS is a production Student Academic Advising Information System for one institution. It helps administrators manage academic structures and accounts, advisers manage assigned students, and students view their own records. It records advising enrollment and grades; it does not perform registrar enrollment.

The interface reference is `mockup/prototype.html`, its route map and the role pages and shared assets it loads; `mockup/PORTAL-SYNC.md` describes the current presentation. Historical generators and orphaned assets are not runtime evidence. Explicit project decisions override prototype defects. `README.md` describes the intended production application; this SRS records detailed development requirements. Browser-only storage, scripted replies and role switching demonstrate workflows and are not production authorization or persistence.

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
| FR-AUTH-01 | Six assignable roles: Student, Adviser, Department Head, Department Staff, Dean and System Administrator. A person may hold multiple scoped role assignments; navigation and access reflect every authorized assignment. Combined prototype personas demonstrate multiple assignments, not additional roles. |
| FR-AUTH-02 | Accounts are admin-provisioned only; no public registration. |
| FR-AUTH-03 | System Administrators provision institutional email, role assignments and profile information. A student receives a program, matching curriculum and active adviser. Adviser and administrative assignments carry their appropriate organizational scope. Student department and college derive from the program. Department Heads and Department Staff may manage accounts within their authorized scope but cannot grant roles. |
| FR-AUTH-04 | A provisioned user sets an initial password through a validated, expiring `/invite/:token` link. |
| FR-AUTH-05 | Email/password login at `/login`. |
| FR-AUTH-06 | Google sign-in succeeds only when the authenticated Google email exactly matches a provisioned profile email. |
| FR-AUTH-07 | Server-side provisioning and institutional-email matching govern new identities for email/password and Google. Unmatched users receive a contact-an-administrator message. Invitation acceptance and password recovery for existing provisioned profiles remain available; account status and authorization are also checked on subsequent access. |
| FR-AUTH-08 | `/forgot-password` and `/reset-password` provide token-validated password recovery. |
| FR-AUTH-09 | Students read their own records and advising notes. Attempt remarks remain staff-only. Current advisers work within their assignments; historical advisers retain authorized read-only access. Staff access is restricted by role, relationship and organizational scope, including in API responses and RLS. |
| FR-AUTH-10 | Session context exposes session, profile, role assignments and loading/auth status to route guards and API calls. RLS/server authorization remains authoritative. |
| FR-AUTH-11 | Only System Administrators assign roles; users cannot grant roles to themselves. |
| FR-AUTH-12 | `/student/profile` shows the student's read-only identity, contact information, program, derived department/college and academic assignments. Corrections are admin-managed. |
| FR-AUTH-13 | Authenticated users can change their password in Settings, verifying the current password and confirming the replacement. Production password storage is handled by Supabase Auth. |
| FR-ORG-01 | A College/Faculty has departments; each Department belongs to exactly one College, and each Program belongs to exactly one Department. Course administration is assigned to a Department. |
| FR-ORG-02 | An Adviser assignment identifies the appropriate organizational scope. A student's program determines their Department and College. These relationships must remain consistent after program/curriculum changes. |
| FR-AUTH-14 | Sign-in provides a keep-signed-in choice and clear feedback for unregistered accounts or invalid credentials. Sign-out ends the active session. Session persistence must respect the selected option and server-side account status. |
| FR-AUTH-15 | Students may upload or remove their own profile photo while identity and academic details remain read-only. The demonstrated upload accepts JPG or PNG up to 2 MB; production storage, content validation and access control must be server-enforced. Students can review adviser and curriculum assignment histories. |

## 4. Administration: accounts, programs and curricula

| ID | Requirement |
| --- | --- |
| FR-ADM-01 | `/admin/accounts` manages institutional accounts, role assignments, invitations and organizational assignments. Department Heads and Department Staff can manage accounts within their authorized scope; role grants remain exclusive to System Administrators. Student provisioning includes one active adviser and one matching curriculum. The exact scoped account-provisioning permissions require review. |
| FR-ADM-02 | The System Administrator lands on the Student directory, with account and organizational management available through authorized navigation. A separate system dashboard is not required. |
| FR-ADM-03 | `/admin/programs` supports CRUD of programs with unique code and name, a required `department_id`, and derived College. |
| FR-ADM-04 | Authorized Department Head and Staff curriculum workflows manage program curriculum versions, effective start/end dates, required units, status and version-specific delinquency threshold. |
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
| FR-CRS-01 | The department course catalogue supports authorized course management: unique code, title, administering Department, lecture/lab hours, units, active/discontinued status and repeat policy (`none`, `grade_replacement`, `additional_credit`). |
| FR-CRS-02 | Different course codes never imply equivalence. Any student-specific decision or explicitly approved curriculum-pair mapping must be recorded and scoped; a code match alone does not create a global equivalence. |
| FR-CRS-03 | Prerequisites have `strict`, `co_requisite` or `recommended` type. Strict prerequisites determine clearance; other types are advisory and do not prevent recording. |
| FR-CRS-04 | Grades use 1.00–5.00 in discrete 0.25 increments. A final or completion grade of 3.00 or lower is Passed; greater than 3.00 is Failed. Midterm grades do not determine final status or GWA. |
| FR-CRS-05 | Authorized term management records school terms, uniquely identified by school year and term type, with an actual term end date, lock state and any authorized override flag, actor and timestamp. Department Head and Staff term actions are described in FR-CRS-11; override authority requires review. |
| FR-CRS-06 | Locked terms block enrollment, initial grade entry, grade/status corrections and prerequisite-grade overrides unless an authorized admin term override applies. **Exception: an unresolved INC may be completed before its deadline even when its term is locked.** Editing an existing INC completion is a correction and obeys the lock. |
| FR-CRS-07 | Every CourseOffering references a school term and course and indicates whether it is by request. Availability must be explicit; courses are not assumed offered every term. |
| FR-CRS-08 | Discontinued required courses may have by-request offerings for older curricula. |
| FR-CRS-09 | Curriculum terms are positional requirements, distinct from calendar school terms. Elective slots may have no fixed course and carry nominal units. |
| FR-CRS-10 | School-term types are 1st Semester, 2nd Semester and Summer/Midyear. UI labels may use Summer/Midyear while stored term type is normalized consistently. |

## 6. Record grades: enrollment and first-time grade entry

The Record grades tab records courses already approved in the institution's separate enrollment process. It also records missing grades. It never edits an existing grade value.

| ID | Requirement |
| --- | --- |
| FR-ENR-01 | Record grades is an Adviser workflow for the selected student and term; `/adviser/enrollment/new` remains an entry route with explicit student context. Enrollment and grade writes are declared contract operations and transactionally enforced server-side. The six advisee-record views are listed in FR-ADV-07. |
| FR-ENR-02 | One Attempt per student + course offering. Retakes use another offering and preserve all earlier attempts. |
| FR-ENR-03 | An attempt may directly fulfill one matching curriculum slot; this optional link is distinct from elective mapping and equivalency. |
| FR-ENR-04 | Attempts carry status (`passed`, `failed`, `currently_enrolled`, `inc`, `dr`, `na`), optional midterm/final grades, an optional instructor name recorded per attempt, INC deadline when applicable, timestamps and audited correction/override provenance. The instructor name is retained with that attempt and visible in authorized course-attempt detail; it does not model instructor scheduling. |
| FR-ENR-05 | A student may have no enrollment records or records in multiple school terms, with one or more courses per recorded term. |
| FR-ENR-06 | Record grades provides a student and school-term selection and a course grid with midterm, final, instructor and remark fields. The adviser can add a course or choose an elective course for a slot. The selected offering must belong to the selected school term and its applicable lock is enforced; changing student or term must not submit stale data. Cross-program records may be unattached to a curriculum slot pending an explicit mapping/equivalency. The production grade-entry and overwrite rules remain FR-ENR-07–11 pending reconciliation with the editable demonstration grid noted below. |
| FR-ENR-07 | Both grades blank on a new offering records Currently Enrolled. Both blank on an existing attempt rejects the duplicate with an already-enrolled message and performs no write. |
| FR-ENR-08 | A new enrollment with a midterm grade requires a confirmation modal explaining that it will enroll the student and record the supplied grades. Cancel performs no write. |
| FR-ENR-09 | A supplied final grade determines Passed/Failed immediately; no final grade means Currently Enrolled. For example midterm 5.00 + final 3.00 is Passed, and final 3.25 is Failed. |
| FR-ENR-10 | For an existing ordinary enrollment, blank inputs leave stored grades unchanged and empty stored grade fields may be filled. Supplying any already-populated grade field, even the identical value, rejects the **entire submission**, including other new fields. The message directs the adviser to Grades. An existing completion grade also counts as an existing final result. INC is handled through Grades. |
| FR-ENR-11 | Example: existing midterm 2.00/final empty + submitted midterm blank/final 1.75 saves the final. Submitting midterm 2.00/final 1.75 rejects both fields. No partial save. |
| FR-ENR-12 | On unsatisfied strict prerequisites, display the missing requirements and offer Continue with override or Cancel. Continue requires an adviser-provided reason and records the override and audit entry with the attempt; Cancel makes no enrollment write. Co-requisite and recommended prerequisites remain advisory. |
| FR-ENR-13 | Only the current adviser may record attempts or initial grades; historical advisers cannot mutate records. Validate offering membership, duplicate keys, grade increments, term lock and preconditions again at commit time to prevent race-condition overwrites. |
| FR-ENR-14 | The grade grid includes INC, DR and NA as well as numeric grades. Selecting DR for a midterm sets the final to DR; a DR final requires a DR midterm, and changing the midterm away from DR clears an incompatible DR final. Exact production status-entry and correction rules remain subject to the decision recorded in §12. |

## 7. Grades, corrections, dropping and prerequisite clearance

| ID | Requirement |
| --- | --- |
| FR-GRD-01 | `/adviser/advisees/:id/grades` shows school terms newest first, then term grades and GWA. Student Grades uses the same chronological order and student-safe data. |
| FR-GRD-02 | The current adviser may correct grades/status, including DR or NA, in Grades when the term is editable. Corrections retain actor, reason, timestamp and old/new values in audit history. Passed/Failed derives from the final grade, not midterm. |
| FR-GRD-03 | Dropping means changing a course attempt to DR; it does not remove the student from the advisee roster. Advisers may correct/reverse course statuses through Grades subject to lock and INC rules. Registrar enrollment is unaffected. |
| FR-GRD-04 | A correction to a failed prerequisite's original final grade requires a passing replacement grade and a reason. It is not a grade for the dependent course and does not require admin approval. This grade correction is distinct from the enrollment warning override in FR-ENR-12. |
| FR-GRD-05 | A prerequisite-grade override updates the original final grade and Passed status atomically with its audit entry, recomputes GWA/standing, and clears the prerequisite for all downstream courses. The student sees the new grade; staff-only reasons are not exposed as advising notes. Original values remain in audit history. |
| FR-GRD-06 | A failed prerequisite remains unfulfilled until a passing retake, valid equivalency, or authorized passing grade correction clears it. An enrollment override does not change the prerequisite grade or mark it passed. There is no fabricated course-code equivalence or automatic pass. |

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
| FR-ADV-14 | Checklist includes Curriculum Shift Preview. Selecting a target program/curriculum projects carried units, lost units and GWA without writing assignments, attempts, mappings or approvals. Automatic matches use course identity only; possible elective/equivalency decisions are explicitly identified for adviser review. A real transfer follows FR-TRN-01; the approved application and mapping rules remain to be specified. |

## 10. Adviser workspace, recommendations and AI

| ID | Requirement |
| --- | --- |
| FR-ADV-01 | A student has exactly one active adviser. An Adviser may have multiple advisees. A System Administrator assignment alone does not grant an advisee assignment; a person who also holds an Adviser assignment may advise within its scope. |
| FR-ADV-02 | Adviser assignments preserve dated history. |
| FR-ADV-03 | Authorized reassignment closes and opens each assignment atomically with identical previous end/new start dates; no gap or multiple active advisers. Server constraints enforce continuity. Bulk Head/Staff reassignment follows FR-ADV-16. No separate admin approval is required for an authorized reassignment. |
| FR-ADV-04 | Student provisioning supplies the initial adviser. Authorized reassignment to another eligible active adviser preserves history; historical adviser access becomes strictly read-only. The scope of direct adviser-initiated reassignment requires review alongside Head/Staff authority. |
| FR-ADV-05 | Adviser dashboard shows assigned advisees, delinquency flags, INC deadlines and relevant recent activity. |
| FR-ADV-06 | `/adviser/advisees` supports current/past views, search and standing filters. The roster presents student identification, program/curriculum, year, GWA, open flags and deficiencies. The additional standing column remains pending the approval recorded in PR #21 (C8). |
| FR-ADV-07 | The advisee record provides Checklist, Grades, Curriculum, Advising, Notes and Audit log views. Record grades remains a separate adviser workflow. Production routes retain an explicit student identifier and do not treat a demonstration persona as an additional role. |
| FR-ADV-08 | Advising integrates recommendations, immediately visible recent advising notes, note entry/view-all and adviser-only AI chat. Note visibility follows FR-NTE-03. |
| FR-ADV-09 | Recommendations cover curriculum terms through **one term beyond the furthest term with a recorded attempt**. Offer exactly three term-type choices: 1st Semester, 2nd Semester, Summer/Midyear; display the associated school year and use that actual school term's offerings. |
| FR-ADV-10 | Recommend eligible unfulfilled requirements and mandatory failed/lapsed-INC retakes. The student chooses retake timing; unmet prerequisite-dependent courses remain excluded. Exclude completed and currently enrolled requirements, unavailable courses and unmet strict prerequisites. Elective recommendations identify actual offered courses, not unenrollable empty slots. |
| FR-ADV-11 | Rows show course code/title, units, Why recommended and applicable Elective, By request and Retake badges. Approved prerequisite-grade corrections count as clearance through the updated passed record. Co-requisite/recommended warnings remain advisory. |
| FR-ADV-12 | The current adviser multi-selects courses and saves a **student-specific, school-term-specific plan**. Plans persist in the database across reloads, appear on the student's dashboard, can be revised by the current adviser, and do not create enrollment attempts or modify registrar data. |
| FR-ADV-13 | If the adviser assistant is implemented for production, it gives record-grounded suggestions using authorized student records. Only authorized advisers may access it. It displays a permanent verification notice and never autonomously writes academic records, grades or enrollments. Provider credentials and access checks are server-side. Simulated mockup replies are a demonstration; the production provider and delivery scope require approval. |
| FR-ADV-15 | Historical advisers cannot add/remove plans, write notes, record/correct grades, map courses or mutate assignments, even through direct API calls. |

## 11. Advising notes and staff remarks

| ID | Requirement |
| --- | --- |
| FR-NTE-01 | Advising displays recent dated append-only general notes immediately, with entry and View all controls. Save student, author, body and timestamp. |
| FR-NTE-02 | Staff can add remarks to a course attempt or curriculum slot, including an empty slot without an attempt. |
| FR-NTE-03 | Advising notes are visible to the student they concern and authorized staff; attempt remarks remain staff-only. Enforce these distinctions in queries, API projections and RLS, not only hidden UI. |
| FR-NTE-04 | Checklist collates remarks across the course's attempts by school term, with timestamps as a tie-breaker. Back-entered records do not change academic chronology. |
| FR-NTE-05 | The adviser Notes view separates active and archived notes. Authorized staff can archive and restore a note; empty notes are rejected. Students see active notes concerning them. Archiving preserves note content and change history rather than deleting it; authorization, retention and audit details require review. |

## 12. Student views and production routes

| ID | Requirement |
| --- | --- |
| FR-STU-01 | `/student/dashboard`: current adviser, GWA, earned units, standing/delinquency, INC alerts, saved term-specific recommendations and quick links. |
| FR-STU-02 | `/student/checklist`: read-only interactive filters, effective slot status and satisfaction provenance without staff-only attempt remarks. |
| FR-STU-03 | `/student/grades`: newest terms first, midterm/final/completion grades, term/cumulative GWA and effective Passed/Failed results. Prerequisite-grade corrections are visible. |
| FR-STU-04 | `/student/enrollment-history`: all attempts, retakes and effective outcomes across terms. |
| FR-STU-05 | Students cannot edit grades, select their own role/adviser/curriculum, persist adviser plans or access adviser-only AI or staff-only attempt remarks. They may read their own advising notes. |
| FR-STU-06 | Checklist terms can be expanded or collapsed, including Collapse all. Each term shows passed and total units and term GWA. Requirement rows show earned/required units, effective status, satisfaction source, attempt count and course details. Year standing and deficiencies include their underlying information. |
| FR-STU-07 | Course details show each attempt's term, midterm, final, completion, instructor and effective result, including earlier retakes and permitted grade-fix history. Staff-only reasons and remarks are excluded from student responses. |
| FR-STU-08 | Checklist and grade-summary downloads open a preview first; a file is generated only after Download PDF. The A4 document includes institutional letterhead, student/program/curriculum/adviser details, the relevant tables, adviser and Department Head signature blocks, page numbers and a not-official-record notice. Download events are audited according to the approved audit policy. |
| FR-STU-09 | The dashboard displays degree progress, adviser contact and assignment history, saved adviser recommendations, INC reminders and read-only advising notes. A student's dashboard does not allow the student to create or alter an adviser plan. |

Production paths retain existing SRS routes where applicable. Advisee record URLs include the student ID, including the advising, checklist, grades, curriculum, notes and audit-log views. `/adviser/enrollment/new` remains a grade-recording entry route with explicit selected-student context. `/settings` handles password changes. Prototype hash routes are demonstration navigation and do not dictate production URL syntax.

### Additional role workflows and notifications

| ID | Requirement |
| --- | --- |
| FR-ROLE-01 | Department Heads manage department-scoped students, adviser assignments, academic terms, curricula and authorized academic decisions. Department Staff manage their department's student, assignment, term, curriculum and course-catalogue workflows and may view role assignments without granting them. |
| FR-ROLE-02 | Deans have read-only faculty-scoped access to student records, reports and audit views. System Administrators manage institutional accounts, role assignments, faculties, departments and programs. Additional access arises only from separately assigned roles and their scope. |
| FR-ROLE-03 | A Dean opening a faculty student record receives read-only Checklist, Grades and Audit log views. Adviser-specific views and writes require a separate authorized Adviser assignment. Opening an authorized record is a candidate View audit event under FR-AUD-05. |
| FR-NOT-01 | Each authorized role has a bell with an unread count, a popover showing recent notifications, Mark all as read and a See all notifications link. The Notifications screen provides All and Unread views, an empty state and links to related pages; opening a notification marks it read. Content respects the recipient's scope and never exposes staff-only remarks. Production delivery, retention and event definitions require review. |
| FR-FLG-01 | Students can flag a recorded grade by choosing a reason and providing required details, then view the question as Under review, Corrected or Rejected. An authorized adviser can correct a grade with a required reason or reject the flag with a required reply; the result and response are visible to that student. A correction updates the academic record and audit history. Production concurrency and notification behavior require review. |
| FR-IMP-01 | The adviser grade-import workflow provides a JSON template, file upload or sample, and a validation report with accepted and rejected rows and reasons. Nothing is applied before confirmation; the adviser can save the accepted rows. Production batch atomicity, permissions and correction rules require review. |
| FR-TRN-01 | An authorized adviser may endorse a curriculum transfer with a required reason; the Department Head can review pending requests, approve or reject them, and review decision history. Rejection requires a reason. Decisions are visible in the authorized adviser and student curriculum histories. Mapping and credit-application rules require review before implementation. |
| FR-CRD-01 | A Department Head can review outside-credit records and request credit for a course for a transferee or shiftee; a submitted grade must use the institutional grading scale and units must be positive. Evidence, approval, GWA treatment and the relationship to a student's curriculum require review. |
| FR-EQV-08 | Department Heads can define an explicit one-to-one course equivalence for a named source and destination curriculum pair; duplicate mappings for the same pair are rejected. This scoped mapping is distinct from a student's equivalency decision (FR-EQV-01–07), is not a global equivalence, and requires review of its application and audit rules. |
| FR-ADM-14 | Department Head and Department Staff student directories support name/number search, curriculum and adviser filters, an enrolled count and spreadsheet import. Import previews invalid and duplicate student numbers, accepts CSV and XLSX, and rejects old XLS with a conversion message. Production provisioning authorization and batch failure rules require review. |
| FR-ADV-16 | Authorized Department Head and Department Staff assignment views show current and previous advisers and the assignment start date. Bulk reassignment requires at least one student and a reason; each affected student's assignment history and zero-gap invariant remain protected. Batch atomicity requires review. |
| FR-CRS-11 | Authorized term management includes closing grade encoding, adding a term with actual end date and encoding deadline, and a backup reminder when encoding closes. Term validation, lock enforcement and the INC-completion exception follow FR-CRS-05–06. The reminder's delivery mechanism requires review. |
| FR-RPT-01 | The adviser dashboard presents grade distribution and GWA by batch/curriculum, with a deficiencies drill-down and an adviser report. Department reports filter by term/program; faculty reports allow department filtering. Authorized users can drill into the relevant students and preview PDF exports. Department Head and Dean access remains scoped; sensitive-view audit policy requires review. |
| FR-AUD-05 | Scoped audit views offer person, student, action and date filters and include relevant View, Change and Sign-in activity. Detail and exports must obey the same scope. Specify which sensitive views are recorded, retention and permitted audit readers before implementation. |
| FR-SET-01 | Authorized Head/Admin settings provide Warning, Probation and Dismissal percentage thresholds, an institutional sender address, last-backup information and a control to record a completed backup. Thresholds are whole percentages from 0 to 100 in increasing order; sender-domain requirements, backup verification and permitted actors require review. Recording a backup is not proof that a backup was performed. |
| FR-CUR-01 | Authorized curriculum management supports selecting, adding, editing and deleting versions, terms and course/elective slots, and displays enrolled-student counts. Department Staff can initiate New course from the curriculum workflow. Existing academic history and required-child constraints follow FR-ADM-13; exact archive/delete permissions require review. |

### Workflow crosswalk and outstanding decisions

The table identifies the current presentation's workflow groups and their SRS disposition. It is an inventory of screens and recorded decisions, not a claim that every demonstration control is backed by production logic. Route labels refer to the role pages loaded by `mockup/prototype.html`; production URL names are specified separately.

| Current presentation | SRS coverage or disposition |
| --- | --- |
| Login, invitation, password change, documentation and per-role navigation | FR-AUTH-01–13, FR-DOC-01 and FR-NOT-01. Role switching in the presentation is demo-only; production uses assigned roles. |
| Student dashboard, checklist, grades, history, profile and notifications | FR-STU-01–05, FR-CHK-01, FR-GWA-01–09 and FR-NOT-01. Course-attempt details include the per-attempt instructor under FR-ENR-04. |
| Student advising notes, grade questions, checklist details and PDFs | FR-NTE-03, FR-FLG-01 and FR-STU-06–08. The student sees their own active notes; attempt remarks remain staff-only. |
| Adviser dashboard, roster, advisee advising/checklist/grades/history/notes/curriculum views | FR-ADV-01–15, FR-CHK-01–02, FR-NTE-01–04 and FR-GRD-01–06. Historical advisers are read-only. |
| Record grades, grade flags, grade import and adviser reassignment | FR-ENR-01–13, FR-FLG-01, FR-IMP-01 and FR-ADV-03–04. The fixed prerequisite warning is FR-ENR-12. |
| Department Head students, assignments, terms, curricula, transfers, equivalence, outside credits, reports, settings and audit | FR-ROLE-01, FR-ADM-04–09 and FR-ADM-14, FR-ADV-16, FR-CRS-11, FR-TRN-01, FR-EQV-08, FR-CRD-01, FR-RPT-01, FR-SET-01 and FR-AUD-01–05. |
| Department Staff students, accounts, assignments, terms, curricula and course catalogue | FR-ROLE-01, FR-AUTH-03, FR-ADM-04–14, FR-ADV-16 and FR-CRS-11. Role assignments are view-only for this role; role grants remain with System Administrators. |
| Dean faculty students, reports and audit; combined role navigation | FR-ROLE-02, FR-RPT-01, FR-AUD-01–05 and FR-AUTH-01. A person receives only the permissions of their actual assignments. |
| System Administrator student directory, accounts, faculties/departments, programs, settings and audit | FR-ADM-01–03, FR-ADM-10–14, FR-AUTH-13, FR-SET-01 and FR-AUD-01–05. Landing behavior is FR-ADM-02. |
| Student grade-summary/checklist PDF and report exports | FR-STU-08, FR-RPT-01 and FR-AUD-04–05. Exports do not alter academic records. Logo and screenshot follow-up is tracked in #29. |
| AI assistant and generated/demo storage | FR-ADV-13: the presentation's replies and browser storage are demonstrations. Production persistence and any AI provider integration require server-side authorization and the approved contract. |

### Screen and action trace

This trace records the distinct screen families in the route map and their primary actions. Head/Dean copies of Adviser screens use the same Adviser requirements only when the person has the relevant Adviser assignment. The Dean + Head presentation combines assigned permissions; it is not an extra role. File references identify the presentation evidence, not production implementations or proof that every control has been browser-tested. The A1–D12 comparison and reviewer decisions in [PR #21](https://github.com/csci153-saais-2026/saais-web/pull/21) provide additional traceability; C8's extra roster column remains pending approval there.

| Screen / source | Actions and requirement IDs |
| --- | --- |
| Login and invitation (`Login.dc.html`, `Invite.dc.html`) | Email/password, Google, keep signed in, invitation and recovery: FR-AUTH-02–08, FR-AUTH-14. |
| Role notification pages (`notifications-page.js`, `portal-ui.js`) | Open bell, mark read, All/Unread, follow notification: FR-NOT-01. |
| Student dashboard (`Student/StudentDashboard.html`, `student-ui.js`) | View adviser assignment history and active advising notes, recommendations, progress and INC reminders: FR-STU-01, FR-STU-09, FR-NTE-03. |
| Student checklist (`Student/StudentChecklist.html`, `student-ui.js`) | Filter and collapse terms, inspect course attempts and preview/download checklist: FR-CHK-01, FR-STU-06–08. |
| Student grades (`Student/StudentGrades.html`, `student-ui.js`) | Review grades, raise/view grade flags, preview/download summary: FR-STU-03, FR-STU-08, FR-FLG-01. |
| Student history and profile (`Student/StudentHistory.html`, `Student/StudentProfile.html`) | Read attempts, assignment/curriculum history; upload/remove photo: FR-STU-04, FR-AUTH-12, FR-AUTH-15. |
| Change password pages | Verify current password and confirm replacement; cancel without a change: FR-AUTH-13. |
| Documentation, design-system and mobile presentation pages (`Docs.dc.html`, `DesignSystem.dc.html`, `Mobile*.dc.html`) | Curated documentation and API viewing: FR-DOC-01; responsive and keyboard-accessible interface: NFR-06–07. The standalone mobile pages and presentation role chooser are demonstrations, not separate production roles or routes. |
| Adviser dashboard (`Adviser/AdviserDashboard.dc.html`, `adviser-pdf.js`) | Filter/report on advisees, inspect deficiencies and preview/export PDF: FR-ADV-05, FR-RPT-01. |
| Adviser roster (`Adviser/AdviserAdvisees.dc.html`) | Search/filter current and past advisees and open records: FR-ADV-06, FR-AUTH-09. |
| Advising (`Adviser/AdviseeAdvising.dc.html`) | Select term recommendations, save a plan, add/read/archive/restore notes, use labelled assistant preview: FR-ADV-08–13, FR-NTE-01, FR-NTE-03, FR-NTE-05. |
| Advisee checklist (`Adviser/AdviseeChecklist.dc.html`) | Filter/collapse requirements, open course information and review mappings: FR-CHK-01–02, FR-ELM-01–05, FR-EQV-01–07. |
| Advisee grades (`Adviser/AdviseeGrades.dc.html`) | Review terms, correct grades or resolve an INC with a reason: FR-GRD-01–06, FR-GWA-01–05. |
| Advisee curriculum (`Adviser/AdviseeCurriculum.dc.html`) | Review current/history, preview a shift and endorse a transfer: FR-ADV-14, FR-TRN-01. |
| Advisee notes and audit log (`Adviser/AdviseeNotes.dc.html`, `Adviser/AdviseeHistory.dc.html`) | Add/archive/restore notes; filter authorized student record history: FR-NTE-01–05, FR-AUD-01–05. |
| Record grades (`Adviser/AdviserEncodeGrades.dc.html`) | Select student/term, add course/elective, enter grades/instructor/remarks, review INCs, save, handle DR and prerequisite warning: FR-ENR-01–14, FR-GWA-01–05. Grid overwrite/status policy remains open. |
| Grade flags (`Adviser/AdviserGradeFlags.dc.html`, `student-flag-feed.js`) | Review questions, correct grade with reason or reject with reply: FR-FLG-01, FR-GRD-02, FR-AUD-01. |
| Grade import (`Adviser/AdviserImportGrades.dc.html`) | Download JSON template, select file/sample, review valid/rejected rows, confirm valid rows: FR-IMP-01. |
| Head/Staff students (`Department Head/Students.dc.html`, `Department Staff/Students.dc.html`, `portal-actions.js`) | Search/filter/reset, view enrolled count, validate and import CSV/XLSX: FR-ADM-14. |
| Head/Staff adviser assignments (`AdviserAssignments.dc.html`, `portal-actions.js`) | Select students and reassign with reason; retain previous adviser and date: FR-ADV-03, FR-ADV-16. |
| Head/Staff academic terms (`AcademicTerms.dc.html`, `portal-actions.js`) | Add term, view term, close encoding; Head previews/export PDF: FR-CRS-05–06, FR-CRS-11, FR-AUD-04. |
| Head/Staff curricula (`Curricula.dc.html`, `curricula-editor.js`) | Select/add/edit/delete versions, terms and slots; Staff starts New course: FR-ADM-04–08, FR-ADM-13, FR-CUR-01. |
| Head curriculum transfers (`Department Head/CurriculumTransfers.dc.html`, `portal-actions.js`) | Review pending transfer; approve or reject with a reason; view decision history: FR-TRN-01. |
| Head equivalence and outside credits (`Equivalence.dc.html`, `OutsideCredits.dc.html`, `portal-actions.js`) | Add a curriculum-pair mapping or credit an outside course with valid grade/units: FR-EQV-08, FR-CRD-01. |
| Head and Dean reports (`head-reports.js`, `dean-reports.js`) | Filter reports, inspect students, preview and download PDF: FR-RPT-01, FR-AUD-05. |
| Head/Admin settings (`Department Head/audit-settings.js`) | Validate/save thresholds and sender; record completed backup: FR-SET-01, NFR-04. A recorded date is not a verified backup. |
| Head/Admin/Dean audit views (`AuditLog.dc.html`, Dean audit pages) | Filter scoped View/Change/Sign-in entries and inspect details: FR-AUD-01–05. |
| Staff accounts and course catalogue (`Department Staff/AccountsRoles.dc.html`, `CourseCatalog.dc.html`) | Manage scoped accounts and catalogue; role assignments remain read-only: FR-AUTH-03, FR-AUTH-11, FR-CRS-01, FR-ROLE-01. |
| Admin student directory and accounts (`SystemAdmin/AdminStudentDirectory.dc.html`, `AdminAccountsRoles.dc.html`) | Open directory, provision and manage accounts and authorized roles: FR-ADM-01–02, FR-AUTH-11. |
| Admin programs and organizational units (`SystemAdmin/AdminPrograms.dc.html`, `AdminFacultyDepartments.dc.html`) | Add/edit/delete subject to validation and retained history: FR-ADM-03, FR-ADM-10–13. |
| Dean students (`Dean/DeanAdviser/DeanStudents.dc.html`) | Filter faculty students and open read-only records: FR-ROLE-02–03, FR-AUD-05. |

Open decisions: the current Record grades demonstration uses an editable multi-course grid, including DR/INC/NA controls, while FR-ENR-07–11 retain previously specified single-attempt and no-overwrite protections. Confirm the accepted status-entry and correction behavior without weakening atomicity or audit. Review production persistence, authorization, concurrent edits and error handling for flags, JSON imports, transfer decisions, outside credits, curriculum-pair equivalence, bulk reassignment, notifications, note archiving, settings, backups and sensitive-view audit events. These workflows do not replace student-specific equivalency or append-only audit history. Hosted backup and recovery remain covered by NFR-04. Record the decisions and update OpenAPI issue #32 before implementation.

## 13. Audit, security and non-functional requirements

| ID | Requirement |
| --- | --- |
| FR-AUD-01 | Audit account/assignment changes, enrollment/initial grades, corrections/drops, enrollment prerequisite overrides and prerequisite-grade corrections, INC completion/correction, mappings/equivalency creation/edit/revoke, term overrides and plan changes. |
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
| OOS-03 | A separate term-lock approval workflow. Authorized Head/Staff term closure is described in FR-CRS-11; override authority remains to be reviewed. INC completion is the documented lock exception. |
| OOS-04 | Adviser capacity limits. |
| OOS-05 | Public self-registration and student self-editing of academic records. |
| OOS-06 | Admin approval for routine adviser actions, including prerequisite-grade overrides. |

## 15. Required acceptance scenarios

1. Admin provisions a student with program/curriculum/adviser; department/College are derived. Adviser account requires College. Role and College/Department filters work together.
2. Blank grades create one enrollment. Repeating it rejects the duplicate without a new attempt or audit write.
3. New enrollment with a midterm opens confirmation. Cancel writes nothing. Midterm 5.00/final 3.00 produces Passed; final 3.25 produces Failed.
4. Existing midterm 2.00/final empty accepts blank midterm/final 1.75. Resubmitting populated midterm 2.00 with the final rejects the whole request and directs the adviser to Grades.
5. An unmet strict prerequisite shows Continue with override and Cancel. Cancel writes nothing; Continue requires a reason and atomically records the enrollment override and audit entry without changing the prerequisite grade. A separate correction to a failed prerequisite requires a reason and follows term-lock rules.
6. Locked terms block ordinary enrollment and grade/status changes. Unexpired INC completion remains permitted; completion 3.00 displays Passed and 3.25 displays Failed. Lapsed unresolved INC remains INC and counts as 5.00 only in calculations.
7. Latest semesters appear first. Back-entered older attempts/remarks do not replace the academically most recent passing attempt or reorder terms incorrectly.
8. Failed requirements remain retake candidates inside the confirmed horizon; students choose timing. Recommendations honor the selected actual offering term and display applicable badges.
9. Plans survive reload, retain student and school term, and appear on the student's dashboard without enrolling them. Historical advisers cannot mutate them.
10. Notes appear in Advising and are readable by the student they concern and authorized staff. Students cannot retrieve attempt remarks or access adviser-only AI.
11. Elective mapping targets only elective slots and shows actual units. Discontinued equivalency rejects sources without another current curriculum membership.
12. Shift preview changes projected results only; compare all persistent tables before/after to prove no academic write.
13. Cross-program offerings can be recorded while registrar enrollment and external approval emails remain outside SAAIS.
14. Deep links refresh successfully in production; documentation routes load curated `docs/` content and the canonical OpenAPI specification without exposing private files.

15. A profile with Department Head and Dean assignments can navigate to each role's authorized workflows in its assigned scope. Neither combination nor prototype persona is an additional role; only a System Administrator can grant assignments.
16. A provisioned person can use email/password or Google. Unregistered identity creation is rejected server-side; a valid invitation and password recovery for an existing profile remain usable.
17. A student flags a grade with details; the current adviser corrects or rejects it with a reason. The student sees the resulting status and response; a correction is audited and reflected in authorized grade views.
18. An adviser archives and restores an advising note. Its content and history remain retained; the student's view shows active notes only and never exposes staff-only attempt remarks.
19. A JSON import is checked before confirmation. Rejected rows display reasons and no rows are saved merely by previewing; the effect and transaction boundary of confirming valid rows follow the approved import policy.
20. An adviser endorses a transfer with a reason. The Department Head can approve or reject it; rejection requires a reason, and authorized student/adviser views show the resulting history. Preview alone does not change curriculum assignments.
21. An authorized Head adds a curriculum-pair equivalence and credits an outside course. Duplicate mapping, invalid grades and nonpositive units are rejected; cross-student application follows the approved mapping policy.
22. A Head or Staff user selects multiple students for reassignment. Missing selection or reason is rejected; each successful reassignment preserves previous adviser history and zero-gap continuity.
23. Checklist and grade-summary PDFs show a preview before download, include the required letterhead and signature details, and do not modify academic data. Access and audit are checked against the approved policy.
24. A Dean can filter faculty reports and open a permitted student record read-only; adviser-only actions remain unavailable without an Adviser assignment. Notifications show unread state and do not expose staff-only remarks.
25. Settings reject out-of-range or unordered standing thresholds. Recording a backup date does not itself perform or verify a backup; production recovery follows NFR-04.
26. The grade grid enforces its DR midterm/final relationship. Production handling of INC/NA, existing-grade edits, and multi-row failure follows the decision recorded in §12 rather than an assumption based on the demo.
