# Department Staff test cases

All cases are **Not run**. These cases describe expected Department Staff pages and workflows. Use authorized accounts and synthetic records. Verify confirmed writes through the service response, resulting UI state and persistence after refresh. Confirmed rejections must leave records unchanged; after a timeout, reconcile the saved record before retrying because the outcome is indeterminate. Mark cases Blocked when their required page or action is unavailable in the revision under test.

## Students

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STF-01 | Students / P1 | Department student records | Inspect Student, ID, email, curriculum, standing, GWA, adviser and enrollment columns. | Values and counts match authorized department records. |
| STF-02 | Students / P1 | Multiple students | Search full/partial name and ID; test case/whitespace/no match; clear search. | Matching rows/count update; no-match state appears; clearing restores scoped list. |
| STF-03 | Students / P1 | Several curricula/advisers | Filter by curriculum and adviser, combine with search, reset. | Filters compose; results remain department-scoped; reset restores defaults. |
| STF-04 | Students / P1 | Valid CSV/XLSX and legacy XLS if supported | Open import, inspect template, upload and review preview. | Preview shows row-level readiness/errors; unsupported format guidance is clear; no write before confirmation. |
| STF-05 | Students / P1 | Invalid/duplicate IDs, email and references | Try malformed number, duplicate ID/email, invalid curriculum/adviser and missing fields. | Invalid rows are identified; rejected data is not committed. |
| STF-06 | Students / P1 | Mixed valid/invalid import | Preview then cancel; repeat and confirm valid rows; refresh. | Cancel writes nothing; confirmation imports only accepted rows once; saved rows persist. |
| STF-07 | Students / P1 | Import API failure/timeout | Submit import during failure; inspect records and retry after recovery. | No false success or partial duplicate import; retry outcome is reconciled. |

## Adviser assignments

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STF-08 | Assignments / P1 | Students with current/previous adviser | Inspect Student, current adviser, effective date and history; search/filter. | Assignment history and current state match service data. |
| STF-09 | Assignments / P1 | Several eligible students | Select one, multiple and all visible students; clear selection. | Selection count is accurate; clear returns to no selection. |
| STF-10 | Assignments / P1 | Eligible adviser and students | Prepare bulk reassignment with target, date and reason; preview and cancel. | Preview lists intended students/target/date/reason; cancel leaves assignments unchanged. |
| STF-11 | Assignments / P0 | Invalid target/date/reason or no selected students | Attempt reassignment with each invalid condition. | Validation blocks invalid request and explains the issue. |
| STF-12 | Assignments / P1 | Effective date today and future date | Confirm reassignment and refresh current/history columns. | Saved assignment and history update once; effective-date semantics are correct. |
| STF-13 | Assignments / P0 | Student outside department or unauthorized target adviser | Attempt assignment directly through UI/API. | Service rejects out-of-scope operation; no assignment changes. |
| STF-14 | Assignments / P1 | Reassignment API error/timeout | Submit and recover; inspect before retry. | No duplicate history or false success; final state matches server response. |

## Academic terms and offerings

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STF-15 | Academic terms / P1 | Open and closed terms | Inspect status, school year/type, dates and encoding state. | Labels and dates match service data. |
| STF-16 | Academic terms / P1 | Add term form | Inspect required fields; cancel; add valid term. | Required values are validated; cancel creates nothing; valid save creates one term. |
| STF-17 | Academic terms / P1 | Invalid year/date/deadline values | Submit malformed year, missing/reversed dates and invalid deadline. | Field errors are clear; invalid term is not saved. |
| STF-18 | Academic terms / P1 | Term detail/history | Open details and inspect date/closure history; return to list. | Correct selected term history appears; navigation returns to list. |
| STF-19 | Academic terms / P1 | Open term with active offerings | Manage opened subjects; filter course/term/curriculum/year and inspect units/by-request state. | Offerings and totals match records; availability and term restrictions are clear. |
| STF-20 | Academic terms / P1 | Close encoding dialog | Start closure, cancel; repeat with required note and confirm. | Cancel preserves open state; confirmed closure records note and blocks subsequent encoding according to policy. |
| STF-21 | Academic terms / P0 | Closed term or unauthorized closure request | Attempt add/edit/encoding operation. | Access and term rules are enforced; no unauthorized write occurs. |
| STF-22 | Academic terms / P1 | Department Staff role | Inspect PDF/export and Head-only controls. | Head-only term PDF/export controls are unavailable to Staff. |

## Curricula

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STF-23 | Curricula / P1 | Multiple curriculum versions | Switch version; inspect units, threshold, effective date, status and enrolled count. | Selected version drives stats/terms; values match records. |
| STF-24 | Curricula / P1 | Add/edit version form | Inspect fields; cancel; create/edit valid version and refresh. | Cancel writes nothing; valid changes persist once and show correct version. |
| STF-25 | Curricula / P1 | Lifecycle status options | Change draft/active/retired with confirmation where required. | Lifecycle rules are enforced; existing student assignments are not silently altered. |
| STF-26 | Curricula / P1 | Terms and course/elective/GE slots | Inspect terms; add/edit slots; cancel and save. | Term position and requirement type are clear; saved changes persist and remain associated with correct curriculum. |
| STF-27 | Curricula / P1 | New course from curriculum form | Start New course and inspect course catalog creation separately from curriculum slot attachment. | Course creation and slot assignment are distinct; no unintended slot is created. |
| STF-28 | Curricula / P1 | Delete version/term/slot | Open confirmation; cancel, then confirm eligible delete. | Target is identified; dependencies are enforced; confirmed deletion is auditable. |
| STF-29 | Curricula / P1 | Staff page | Look for Copy from/version clone action. | Head-only Copy from action is unavailable to Staff. |

## Course catalog

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STF-30 | Course catalog / P1 | Existing courses | Inspect code, title, units, status and organization fields. | Displayed data and badges match records. |
| STF-31 | Course catalog / P1 | Search and status/org filters | Search code/title; combine status/faculty/department filters; reset. | Results update correctly; empty state and reset work. |
| STF-32 | Course catalog / P1 | Add/edit course | Create valid unique course; edit; cancel then save and refresh. | Cancel preserves prior data; successful save updates only intended course and persists. |
| STF-33 | Course catalog / P1 | Invalid course values | Try missing/duplicate code, missing title, nonpositive units, invalid type/status. | Invalid values are rejected and not persisted. |
| STF-34 | Course catalog / P1 | Existing course | Delete with cancel then confirm where permitted. | Cancel leaves course; confirmed delete follows dependency policy and is audited. |
| STF-35 | Course catalog / P1 | Prerequisite controls | Add strict, co-requisite and recommended relationships; inspect labels. | Relationship types and course links are accurately displayed. |
| STF-36 | Course catalog / P1 | Invalid prerequisite relationship | Try self/duplicate/missing course relationship. | Invalid relationship is rejected; existing course data remains intact. |

## Accounts and roles

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STF-37 | Accounts / P1 | Department accounts | Inspect name, email, organization and role badges; search/filter. | Only authorized scoped accounts appear; role/scope values are correct. |
| STF-38 | Accounts / P1 | Add account invitation | Open form, inspect allowed fields/roles, cancel, then invite valid department account. | Cancel adds nothing; valid invitation is created once with correct scope and delivery status. |
| STF-39 | Accounts / P1 | Conditional Student role fields | Select permitted role combinations and Student role if available. | Applicable fields appear; role and scope are explicit and validated. |
| STF-40 | Accounts / P1 | Invalid or duplicate account fields | Try missing name/email, malformed and duplicate email. | Invalid account/invitation is rejected; no partial record is created. |
| STF-41 | Accounts / P0 | Prohibited roles and scope | Attempt Dean/Admin role grant, self-escalation and outside-department account. | UI and service reject prohibited roles and out-of-scope grants. |
| STF-42 | Accounts / P1 | Pending invitation | Resend or revoke; open prior token. | Current invitation state is respected; revoked/superseded token cannot activate. |

## Notifications, account and shared behavior

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STF-43 | Notifications / P1 | Read/unread notifications | Switch All/Unread, mark all read and follow target. | Counts/read status persist; target opens correct authorized page. |
| STF-44 | Account menu / P1 | Staff session | Open profile menu; use Change password and Sign out. | Menu links correctly; sign-out ends session and protected pages require authentication. |
| STF-45 | Change password / P1 | Local-password account | Test missing/wrong current, invalid policy, mismatch and valid password. | Invalid inputs are rejected; successful change applies and session policy is observed. |
| STF-46 | Navigation / P1 | Staff session | Navigate pages, refresh and use back/forward; inspect mobile navigation. | Correct page and active link remain; navigation works at supported sizes. |
| STF-47 | Persistence / P1 | Save supported curriculum/course/term/account change | Navigate away, refresh and inspect related list/count/audit. | Confirmed changes persist once; canceled/failed changes do not appear. |
| STF-48 | Error handling / P1 | API timeout, permission error and validation error | Exercise read/write paths under each response. | Clear error state; no false success or partial mutation; retry is safe. |
| STF-49 | Accessibility/privacy / P1 | Keyboard, narrow viewport, zoom and HTML-like input | Use forms/dialogs and render harmless markup-like text. | Controls remain usable and labeled; focus is visible; text is inert and data stays scoped. |

## Run record

```text
Run ID:
Application version:
Environment/browser:
Tester/date:
Test account/fixture (synthetic identifier only):
Passed / Failed / Blocked:
Defects and notes:
```

Record each case as **Not run**, **Pass**, **Fail**, **Blocked**, or **Not applicable**. For failures, include expected/actual result, screen, synthetic fixture, timestamp and evidence.
