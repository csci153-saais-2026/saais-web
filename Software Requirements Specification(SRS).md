All Functional Requirements derivable from `README.md` (§1, §6, §7, §8, §9):

### 1. Authentication, Accounts & Roles

| ID         | Requirement                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-AUTH-01 | System shall support 3 roles: `student`, `adviser` (`academic adviser`), `admin` (`system administrator`).                                                                                                                                       |
| FR-AUTH-02 | Accounts shall be **admin-provisioned only** — no public self-signup.                                                                                                                                                                            |
| FR-AUTH-03 | Admin shall create profile with institutional `email` + `role` + `department_id`.                                                                                                                                                                |
| FR-AUTH-04 | Invited user shall set initial password via `/invite/:token`.                                                                                                                                                                                    |
| FR-AUTH-05 | System shall support email/password login at `/login`.                                                                                                                                                                                           |
| FR-AUTH-06 | System shall support Google OAuth sign-in only if Google email **exactly matches** pre-registered `profiles.email`.                                                                                                                              |
| FR-AUTH-07 | System shall reject mismatched Google SSO login server-side via Auth `before user created` hook (not client check) with message “contact an administrator”.                                                                                      |
| FR-AUTH-08 | System shall support `/forgot-password`, `/reset-password` recovery.                                                                                                                                                                             |
| FR-AUTH-09 | System shall enforce role-based access: Student sees own records only; Adviser sees/acts only on assigned advisees (+read-only historic); Admin has full management tables; Notes/Remarks staff-only (`adviser+admin`), never `student`-visible. |
| FR-AUTH-10 | `SessionContext` shall expose `{session, profile, role, status}` as auth source of truth; route guards + API client read from it.                                                                                                                |
| FR-AUTH-11 | `role` shall be admin-set only, never self-editable.                                                                                                                                                                                             |
| FR-AUTH-12 | Student shall view own profile/contact info at `/student/profile`.                                                                                                                                                                               |

### 2. Admin — Account / Program / Curriculum Management

| ID        | Requirement                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-ADM-01 | Admin shall provision/manage accounts & roles with department assignment, and send invites (`/admin/accounts`).                                                                          |
| FR-ADM-02 | Admin shall view system-wide stats (`/admin/dashboard`).                                                                                                                                                                |
| FR-ADM-03 | Admin shall CRUD Programs (`code unique`, `name unique`, `faculty_id`) associated with a Faculty (`/admin/programs`).                                                                    |
| FR-ADM-04 | Admin shall CRUD CurriculumVersions per Program with `effective_start`, `effective_end nullable`, `delinquency_threshold` (`/admin/curricula`).                                                                         |
| FR-ADM-05 | A Program shall have 1+ CurriculumVersions; each version belongs to exactly 1 Program.                                                                                                                                  |
| FR-ADM-06 | Admin shall manage CurriculumTerms (`year_level`, `term_sequence`) within a version; each curriculum has 1+ terms, each term 1+ courses.                                                                                |
| FR-ADM-07 | A course may appear in multiple curricula (M:M via `CurriculumTermCourse` checklist slot).                                                                                                                              |
| FR-ADM-08 | Each curriculum shall define its own `delinquency_threshold`.                                                                                                                                                           |
| FR-ADM-09 | Student shall be assigned to exactly 1 curriculum at a time; changes tracked as dated history (`StudentCurriculumAssignment: start_date, end_date nullable, reason`) — never overwrite. Transfer/shift creates new row. |
| FR-ADM-10 | Admin shall CRUD Faculties (`faculty` entity: `name unique`), displayed in the UI as "College" or "Faculty".                                                                            |
| FR-ADM-11 | Admin shall CRUD Departments (`department` entity: `faculty_id FK`, `name unique`) under a parent Faculty.                                                                               |
| FR-ADM-12 | Admin shall filter accounts and programs by College and Department (`/admin/accounts`, `/admin/programs`).                                                                               |

### 3. Admin — Courses, Prerequisites, Terms, Offerings

| ID        | Requirement                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-CRS-01 | Admin shall CRUD Courses: `code unique`, `title`, `department_id`, `lecture_hours`, `lab_hours`, `units`, `status(active/discontinued)`, `repeatable_type(none/grade_replacement/additional_credit)` (`/admin/courses`). |
| FR-CRS-02 | System shall never assume equivalence across different course `code`s.                                                                                                                                  |
| FR-CRS-03 | Admin shall CRUD Prerequisites with `type(strict/co_requisite/recommended)`; only `strict` triggers enrollment warning.                                                                                 |
| FR-CRS-04 | System shall define fixed grading scale 1.00 (best)–5.00 (fail), passing ≤3.00, discrete 0.25 increments.                                                                                               |
| FR-CRS-05 | Admin shall manage SchoolTerms (`school_year + term_type` natural key), `is_locked`, `override_flag`, `override_actor_id`, `override_at` (`/admin/course-offerings`).                                   |
| FR-CRS-06 | Locked term shall block edits outside override; only lock state + flag/timestamp/actor modeled (no workflow).                                                                                           |
| FR-CRS-07 | Admin shall manage CourseOfferings (`school_term_id`, `course_id`, `is_by_request`) — course not assumed available every term.                                                                          |
| FR-CRS-08 | Offering may be flagged `by_request` for discontinued courses needed under older curriculum.                                                                                                            |
| FR-CRS-09 | Curriculum term slot (positional: `CurriculumTermCourse`) is distinct from school term (calendar instance). Slot may be elective (`is_elective_slot`, `course_id nullable`, `nominal_units`).           |
| FR-CRS-10 | Each Course shall be associated with an administering Department (`department_id` FK); Admin shall filter the course catalog by Department (`/admin/courses`).                                                           |

### 4. Enrollment & Attempts (Adviser)

| ID        | Requirement                                                                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-ENR-01 | Adviser shall record enrollment attempt via `/adviser/enrollment/new` → `POST /functions/v1/enrollment-attempts` (`recordEnrollmentAttempt`).                                                        |
| FR-ENR-02 | Each Attempt shall reference specific `course_offering_id`; natural key `(student, course_offering)`.                                                                                                |
| FR-ENR-03 | Each Attempt may optionally reference `curriculum_term_course_id` (direct slot fulfilled); nullable; distinct from `ElectiveMapping`/`EquivalencyDecision`.                                          |
| FR-ENR-04 | Attempt shall carry `status(passed/failed/currently_enrolled/inc/dr/na)`, `midterm_grade`, `final_grade`, `inc_deadline nullable`, `prerequisite_override bool`.                                     |
| FR-ENR-05 | Student may be enrolled in 0+ school terms, 1+ courses per term.                                                                                                                                     |
| FR-ENR-06 | Prerequisite enforcement shall be **soft check**: on strict unsatisfied, show warning modal **Continue/Cancel** (dry-run pre-submit call). `Cancel` aborts; `Continue` re-issues with override flag. |
| FR-ENR-07 | `Continue` override shall write attempt + audit record together (`attempt.prerequisite_override=true`).                                                                                              |
| FR-ENR-08 | Non-strict (`co_requisite`, `recommended`) shall not block — advisory only.                                                                                                                          |

### 5. INC, GWA, Delinquency

| ID        | Requirement                                                                                                                                                                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-GWA-01 | INC shall have `inc_deadline` (default 1 year from term incurred).                                                                                                                                                                                                                           |
| FR-GWA-02 | INC resolved before deadline via `INCResolution(attempt_id unique, completion_grade, resolved_at)` — 1:0-or-1.                                                                                                                                                                               |
| FR-GWA-03 | Unresolved INC past deadline (**lapsed INC**) shall keep `status=INC` permanently — never auto-changed to `Failed`.                                                                                                                                                                          |
| FR-GWA-04 | GWA computation shall treat lapsed INC as 5.00 for calculation only (computed rule at read time, not stored transition).                                                                                                                                                                     |
| FR-GWA-05 | Delinquency flag shall treat lapsed INC as failed-units, consistent with GWA.                                                                                                                                                                                                                |
| FR-GWA-06 | Units-earned/GWA counting by `repeatable_type`: `none`/`grade_replacement` → once Passed, **most recent Passed** counts permanently (later failure never reverts); if never passed, most recent attempt counts. `additional_credit` → each Passed counts independently. Others history-only. |
| FR-GWA-07 | Term/cumulative GWA shall be derived unit-weighted, cached with recompute trigger on grade insert/update.                                                                                                                                                                                    |
| FR-GWA-08 | Scheduled `POST /functions/v1/recompute-lapsed-inc` (`recomputeLapsedIncGwa`) shall run daily via `pg_cron` (service-role only, not reachable from SPA) to invalidate/recompute caches whose INC deadline newly passed + delinquency flags. Live uncached reads always apply deadline check. |
| FR-GWA-09 | Delinquency flag computed per student per term vs curriculum’s threshold using `Failed + lapsed INC` failed-units.                                                                                                                                                                           |

### 6. Elective Mapping

| ID        | Requirement                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-ELM-01 | Adviser shall map enrolled course to elective slot even if codes differ (`/adviser/advisees/:id/checklist`).                                                |
| FR-ELM-02 | Mapping recorded per-student vs specific `attempt_id` + `curriculum_term_course_id` (must be elective slot) + `mapped_by` — not standing code-to-code rule. |
| FR-ELM-03 | Distinct from transfer equivalency.                                                                                                                         |
| FR-ELM-04 | Revisable/reversible by adviser; changes audited.                                                                                                           |
| FR-ELM-05 | If mapped units differ from `nominal_units`, checklist displays actual units earned.                                                                        |

### 7. Curriculum Equivalency (Transfer / Discontinued)

| ID        | Requirement                                                                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-EQV-01 | Adviser shall decide passed old-curriculum course satisfies specific new-curriculum course strictly one-to-one via `POST /functions/v1/equivalency-decisions` (`applyEquivalencyDecision` atomic). |
| FR-EQV-02 | Passed course may have no equivalent → take new course normally.                                                                                                                                   |
| FR-EQV-03 | Record per student: `attempt_id` (original passed), `destination_curriculum_term_course_id`, `decision_type(transfer_equivalency/discontinued_course_equivalency)`, `decided_by`, `decided_at`.    |
| FR-EQV-04 | For discontinued required: adviser may declare equivalent from another current curriculum provided units ≥ original slot units (alternative to by-request offering).                               |
| FR-EQV-05 | Checklist shall show satisfaction source: `direct / transfer equivalency / discontinued-equivalency / elective mapping`.                                                                           |
| FR-EQV-06 | Revocable/editable, audited.                                                                                                                                                                       |
| FR-EQV-07 | Uses original attempt grade/units for display; creates no new attempt; does not re-trigger GWA recompute.                                                                                          |

### 8. Adviser Portal, Advisee 360 & Advising Workspace

| ID        | Requirement                                                                                                                                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-ADV-01 | Adviser may have 1+ advisees; student has exactly 1 active adviser at all times.                                                                                                                                                                         |
| FR-ADV-02 | Assignments retain full dated history (`start_date`, `end_date nullable=null active`).                                                                                                                                                                   |
| FR-ADV-03 | Reassignment (`/adviser/reassignment` → `POST /functions/v1/adviser-reassignment`) shall be atomic: new `start_date` == prior `end_date` — enforced in single transaction + DB constraint/trigger backstop so student never left without active adviser. |
| FR-ADV-04 | Admins are not assigned advisees.                                                                                                                                                                                                                        |
| FR-ADV-05 | Adviser dashboard shall show advisee list + delinquency flags + INC-deadline alerts.                                                                                                                                                                     |
| FR-ADV-06 | Adviser shall search/filter current & past advisees (`/adviser/advisees`).                                                                                                                                                                               |
| FR-ADV-07 | Adviser shall access the Advisee 360 view (`/adviser/advisees/:id`) containing 7 distinct subnavigation tabs: Overview, Advising, Checklist, Grades, History, Notes, and Documents.                                                                     |
| FR-ADV-08 | Adviser shall access the dedicated Advising Workspace (`/adviser/advisees/:id/advising`) integrating term-filtered Course Recommendations, recent staff notes summary, and the AI Advising Assistant chat interface.                                    |
| FR-ADV-09 | System shall generate dynamic Course Recommendations filtered by school term, identifying eligible courses where all strict prerequisites are cleared (passed or overridden) that satisfy unfulfilled curriculum checklist slots or mandatory retakes.    |
| FR-ADV-10 | Each course recommendation shall display code, title, units, recommendation rationale ("Why recommended"), and term badge (`Elective`, `By request`, `Retake`). Courses with unmet prerequisites or not offered in the selected term shall be excluded.    |
| FR-ADV-11 | Adviser shall be able to multi-select recommended courses and trigger enrollment planning ("Add selected to plan" / pre-populate enrollment attempt) directly from the recommendations table.                                                           |
| FR-ADV-12 | System shall provide an AI Advising Assistant chat interface within the Advising Workspace that drafts recommendations grounded in the student's academic record, cleared prerequisites, and degree requirements.                                      |
| FR-ADV-13 | AI Advising Assistant shall display a permanent verification notice ("Drafts suggestions from this record — always verify before acting") and operate as an advisory preview that does not autonomously persist database modifications.                |
| FR-ADV-14 | Adviser shall access the Curriculum Shift Preview simulator on `/adviser/advisees/:id/checklist` to simulate program/curriculum shifts (projecting carried units, lost units, and projected GWA) as a read-only preview that writes no persistent database records. |

### 9. Advising Notes & Remarks

| ID        | Requirement                                                                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-NTE-01 | Adviser shall add/view dated, append-only free-text general notes per student (`AdvisingNote: student_id, authored_by, body_text`).                                                |
| FR-NTE-02 | Adviser shall add attempt-level remarks (`AttemptRemark: attempt_id nullable, curriculum_term_course_id nullable, authored_by, body_text`) including on empty slot (attempt null). |
| FR-NTE-03 | Notes + remarks staff-only, never student-visible.                                                                                                                                 |
| FR-NTE-04 | Checklist shall collate all remarks across every attempt of a course, ordered by term.                                                                                             |

### 10. Student Views

| ID        | Requirement                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------- |
| FR-STU-01 | Student dashboard (`/student/dashboard`): current adviser, cumulative GWA, delinquency flag, quick links. |
| FR-STU-02 | Student checklist (`/student/checklist`): status per slot incl. satisfaction source.                      |
| FR-STU-03 | Student grades (`/student/grades`): term-by-term grades, term & cumulative GWA.                           |
| FR-STU-04 | Student enrollment-history (`/student/enrollment-history`): all attempts across terms.                    |

### 11. Audit & Contract/Docs

| ID        | Requirement                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-AUD-01 | System shall audit: INC completions, grade corrections, equivalency approvals/revokes, elective mapping changes, prerequisite-warning overrides.            |
| FR-AUD-02 | Each `AuditLogEntry`: `actor_id nullable (null=system e.g. INC recompute)`, `action`, `entity_type`, `entity_id`, `old/new jsonb`, `reason?`, `created_at`. |
| FR-AUD-03 | Audit log append-only/immutable at DB level; Admin viewer read-only (`/admin/audit-log`).                                                                   |
| FR-AUD-04 | Structured records are single source of truth; exports read-only.                                                                                           |
| FR-DOC-01 | System shall serve Redoc view of `contract/openapi.yaml` at `/docs` — open in dev, auth-gated in deployed envs + static CI bundle.                          |

### 12. Non-Functional Requirements (`README.md` §10 + §9/§1)

| ID     | Requirement                                                                                                                                                                 | Source        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| NFR-01 | System shall be designed for mid-size university scale: thousands of students, tens of thousands of attempts/year, absent other guidance.                                   | §10           |
| NFR-02 | Audit log + historical adviser-assignment / curriculum-assignment records shall be retained indefinitely — no auto-purge.                                                   | §10           |
| NFR-03 | GWA/delinquency caching shall use recompute trigger on grade insert/update + scheduled INC-deadline check (§9 `recomputeLapsedIncGwa` via `pg_cron`).                       | §10, §9       |
| NFR-04 | Backup/recovery shall rely on hosted Supabase built-in backup tier — no custom backup pipeline for v1.                                                                      | §10           |
| NFR-05 | System shall support latest two versions of Chrome, Firefox, Safari, Edge — no legacy browser support.                                                                      | §10           |
| NFR-06 | UI shall be responsive across desktop and mobile; mobile-first breakpoints; checklist/grade tables collapse to stacked cards below `md`; nav collapses to drawer/hamburger. | §1, §9        |
| NFR-07 | UI shall target WCAG 2.1 AA: semantic HTML, keyboard-navigable forms/modals, contrast for Passed/Failed/INC/DR/NA badges (not color alone), labeled inputs.                 | §9            |
| NFR-08 | Data Privacy Act (RA 10173) compliance review required before any deployment with real student data.                                                                        | §12.12, §15.9 |

### 13. Out of Scope (`README.md` §11) — explicitly NOT to be built in v1

| ID     | Excluded item                                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| OOS-01 | Thesis advising.                                                                                                            |
| OOS-02 | Section / instructor / schedule-level offering detail and registrar enrollment mechanics (section strings displayed in mockups are cosmetic display-only labels; no timetable scheduling, classroom allocation, section capacity tracking, or autonomous AI enrollment is modeled). |
| OOS-03 | Term-lock override **workflow mechanics** — only lock state + `override_flag/timestamp/actor` modeled, no approval process. |
| OOS-04 | Adviser advisee-capacity limits.                                                                                            |
| OOS-05 | Public self-service account registration (admin-provisioned only).                                                          |
