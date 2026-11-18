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
3. Attempt to open Department Head, Adviser, or System Administrator routes using a Dean-only account. Access is denied or the route is absent, according to the mockup’s role navigation.
4. Repeat with a multi-role account. Only routes corresponding to roles assigned to that account are available; the account’s primary role does not erase its additional assigned roles.

## Review checks

- Do not assume all Dean accounts are multi-role or that the demo’s combined persona represents a Dean-only account.
- Current shared dean personas include Adviser; a Dean-only fixture may be needed to execute step 3.
- QA approval: [ ]  Dean/project reviewer approval: [ ]

**Execution status:** Specification only; not yet run. Shared-data prerequisite: identify an existing Dean-only test account or ask the mock-data owner to provide one.
