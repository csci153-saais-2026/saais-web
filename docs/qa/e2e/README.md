# SAAIS manual end-to-end test cases

These are reviewable test specifications for the Milestone 2 contract/mock work. They are based on the role mockup screens and decisions recorded by the project owner. The Playwright suite under `mockup/e2e/` automates visible role screens and prototype interactions using the static prototype's existing demo data. It does not exercise the React application or MSW contract handlers.

Run the suite with `npm run test:prototype:e2e`. No app fixtures or new prototype personas are added by these tests. Prototype checks demonstrate the selected mockup flow; they do not establish that API handlers or production authorization enforce the same rules.

## Coverage

| Case | Primary role | Coverage |
| --- | --- | --- |
| Case | Automated prototype coverage | Not verified by this prototype suite |
| --- | --- | --- |
| TC-01 | Student dashboard, checklist, grades, history, notes panel and notification screen; staff grade controls are absent from student screens | Archived-note status and cross-account privacy enforcement |
| TC-02 | Prerequisite recommendations, locally saved term plan and note, assistant preview | Contract persistence, adviser authorization, and the requested “AI can make mistakes” copy (the current mockup says to verify before acting) |
| TC-03 | Grade dialog requires a reason before saving | Passed-course retake denial, audit persistence, failed-retake GWA replacement |
| TC-04 | INC completion action and retained attempt display | Deadline enforcement and contract-level audit/authorization |
| TC-05 | Department Staff roster and adviser filter | Student provisioning/required initial adviser and grade-closure behavior |
| TC-06 | Adviser assignment workspace and table | Reassignment reason validation, history persistence and former-adviser scope |
| TC-07 | Pending transfer review workspace | Approve/reject persistence and keeping the old adviser until separate reassignment |
| TC-08 | Outside-credit and equivalency workspaces/actions are visible | 1.00–3.00 validation, revocation behavior and historical report preservation |
| TC-09 | Adviser grade-attempt and checklist views | Additional-credit classification, beyond-requirement units/GWA and passed-course retake denial |
| TC-10 | Dean faculty report screen and summary metrics | Direct-route authorization denial and multi-role permission enforcement |
| TC-11 | System Admin accounts/roles and audit-log screens | Required-adviser validation, role enforcement, and the audited override action |
| TC-12 | Notification inbox screens for available role personas | Recipient isolation and independent read state between accounts |

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

## Prototype limits and later app acceptance

- Several test specifications contain policy assertions that the static prototype does not implement as interactive behavior. Those assertions remain manual acceptance criteria for the future React/MSW implementation; the browser suite does not mark them as passed.
- The prototype's route selector is a presentation/demo mechanism, not authentication. Screens can be opened directly, so role-denial tests cannot be meaningfully run against it.
- Account provisioning, transfer decisions, outside-credit grade validation, adviser reassignment persistence, additional-credit attempt rules, audited overrides and per-account notification isolation need a real app/handler test target and the shared scenarios described in the individual case files.
- The student-facing notes panel shows notes, but does not expose active versus archived status as a testable distinction. Keep the agreed rule that archived notes remain visible when adding app-level coverage.
- The mockup assistant currently displays “Always verify before acting.” The later requested caution “AI can make mistakes” is not present in the prototype copy; the current test does not claim to verify that wording.

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
