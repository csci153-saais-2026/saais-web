# TC-10 — Dean reviews faculty reports within assigned roles

**Role:** Dean; separately verify any additional roles actually assigned to the account.
**Shared personas/data:** dean and/or dean_dept_head, with the exact assigned role set displayed before testing.
**Mockup sources:** mockup/Dean/DeanAdviser/DeanReports.dc.html, DeanStudents.dc.html, mockup/Dean/DeanDH/DHDeanReports.dc.html.

## Preconditions

- The reviewer records which roles the chosen account has before testing.
- A report includes records from the Dean’s faculty and at least one record outside that scope.

## Steps and expected results

1. Sign in and open Dean reports. Reports are limited to the Dean’s faculty scope and show the available department/batch/curriculum filters.
2. Drill into a report row or student list. The details remain within the allowed faculty scope.
3. Directly navigate to the Department Head, Adviser, and System Administrator routes listed in mockup/prototype-routes.js while signed in as a Dean-only account. Each unassigned route must be denied by the application’s route authorization. A hidden navigation link alone does not pass this step.
4. Repeat with a multi-role account. Only routes corresponding to roles assigned to that account are available; the account’s primary role does not erase its additional assigned roles.

## Review checks

- Do not assume all Dean accounts are multi-role or that the demo’s combined persona represents a Dean-only account.
- Verify denial through direct route access; absence of a menu item is not an authorization check.
- Current shared dean personas include Adviser; a Dean-only fixture may be needed to execute step 3.
- QA approval: [ ] Dean/project reviewer approval: [ ]

**Execution status:** Automated prototype coverage: Dean faculty reporting view and summary metrics. Direct-route denial and multi-role authorization are not testable in the route-switching prototype.
