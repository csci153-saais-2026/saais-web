# SAAIS manual end-to-end test cases

These are reviewable manual test specifications for the Milestone 2 contract/mock work. They are based on the role mockup screens and decisions recorded by the project owner. They are not automated Playwright tests, and they have not been executed against handlers.

Use only the shared synthetic personas and records documented in src/mocks/README.md and src/mocks/SCENARIOS.md. Do not add test-specific application fixtures. If a scenario needs a record that is missing, identify that as a shared mock-data prerequisite for the mock-data owner.

## Coverage

| Case | Primary role | Coverage |
| --- | --- | --- |
| TC-01 | Student | Own checklist, grades, notes including archived notes, data privacy |
| TC-02 | Adviser | Advisee checklist, prerequisites, term recommendations, saved plan and note |
| TC-03 | Adviser | Grade entry/correction, passed-course retake restriction, failed-retake GWA behavior |
| TC-04 | Adviser | INC deadline, completion grade, preserved attempt |
| TC-05 | Department Staff | Student provisioning with initial adviser; current-department grade closure |
| TC-06 | Department Staff / Department Head | Separate adviser reassignment, reason and history |
| TC-07 | Department Head | Cross-department transfer; old adviser remains until separate reassignment |
| TC-08 | Department Head | Outside-credit grade limits, equivalency and historical preservation |
| TC-09 | Adviser | Additional-credit repeatable course attempts and checklist/GWA results |
| TC-10 | Dean | Faculty-scoped reporting and role-specific access |
| TC-11 | System Administrator | Account/role administration and audited lock override |
| TC-12 | All six roles | Current account’s notifications and multi-role inbox behavior |

## Source and execution notes

- Mockup routes and screens are linked in each case. For cross-source conflicts, the approved mockup is the baseline unless a decision in the project owner’s conversation explicitly resolves the exception.
- Archived advising notes remain visible to students.
- A student needs an initial adviser. Outside-credit grades must be passing (1.00–3.00). A passed course cannot be retaken. A failed grade stays in cumulative GWA while a retake has no result; after a graded retake it remains on the transcript marked repeated and is excluded from cumulative GWA.
- Transfers follow the mockup. Approving a transfer does not automatically replace the adviser; the existing adviser stays until a separate reassignment.
- Grade-entry closure is controlled by the student’s current department, even when the course offering belongs to another department.
- A user may hold multiple roles. Evaluate each role’s access separately; do not treat the primary role label as the whole permission set.
- For elective mapping/equivalency revocation, preserve past reports and exclude the revoked credit from current/future calculations only.
- Do not add semestral GWA expectations beyond what the mockup displays.
- Issue #45 requires QA and an appropriate project reviewer to approve each case. Approval checkboxes are intentionally left unchecked.

## Review blockers to resolve before execution

1. The documented dean and dean_dept_head personas include additional roles. A Dean-only access scenario needs a shared Dean-only test account if reviewers require it; do not create a local fixture in this folder.
2. The agreed System Administrator audited override has no clearly identified control in the current System Admin mockup. The expected audit behavior is recorded in TC-11; the UI/action route needs owner review before that case can be executed.
3. TC-05 requires a shared record where a course is offered by a different department than the student’s current department. Confirm the shared scenario provides it before execution.
4. TC-03 requires a shared failed-course retake scenario, including a pending retake. If the shared dataset does not contain one, request it from the shared mock-data owner.

## Individual cases

- [TC-01 — Student academic record and privacy](TC-01-student-academic-record.md)
- [TC-02 — Adviser checklist and advising plan](TC-02-adviser-checklist-and-plan.md)
- [TC-03 — Grade entry, correction, retake and GWA](TC-03-grade-entry-correction-retake-gwa.md)
- [TC-04 — INC deadline and completion](TC-04-inc-deadline-and-completion.md)
- [TC-05 — Student provisioning and department grade closure](TC-05-student-provisioning-and-grade-closure.md)
- [TC-06 — Adviser reassignment and history](TC-06-adviser-reassignment-and-history.md)
- [TC-07 — Cross-department curriculum transfer](TC-07-cross-department-transfer.md)
- [TC-08 — Outside credits and equivalencies](TC-08-outside-credit-and-equivalency.md)
- [TC-09 — Additional-credit courses and checklist decisions](TC-09-additional-credit-and-checklist.md)
- [TC-10 — Dean reports and role scope](TC-10-dean-reports-and-role-scope.md)
- [TC-11 — System administration and audited override](TC-11-system-admin-and-audited-override.md)
- [TC-12 — Role-scoped notifications](TC-12-role-scoped-notifications.md)
