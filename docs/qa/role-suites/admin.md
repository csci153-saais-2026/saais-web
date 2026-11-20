# System Administrator test cases

All cases are **Not run**. The current System Administration route presents its portal entry shell and System Operations summary. The scenarios below provide acceptance coverage for the documented administration workflows in the requirements, API contract and screen definitions. Use authorized admin accounts and synthetic records; mark unavailable workflows Blocked until they can be executed.

## Portal entry and student directory

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADM-01 | Portal entry / P0 | Active System Admin account | Sign in and open System Administration portal. | Admin role reaches its portal shell; non-admin and anonymous sessions cannot access protected admin data. |
| ADM-02 | Portal entry / P1 | Admin portal loaded | Inspect heading, System Operations summary and available navigation. | Entry content is clear; links open matching admin pages; unavailable workflows are not presented as completed operations. |
| ADM-03 | Student directory / P1 | Students across departments/programs/statuses | Inspect directory columns, counts, search and filters. | Directory values match records; search/filter/counts compose correctly and empty state is clear. |
| ADM-04 | Student directory / P0 | Student record exists | Open record and inspect profile/details. | Authorized details load; student data is not editable through read-only directory views unless specifically permitted. |
| ADM-05 | Student directory / P0 | Unauthorized or nonexistent student ID | Open guessed record route/request. | Request is denied or returns not found without leaking student existence or details beyond policy. |
| ADM-06 | Student import / P1 | Valid, invalid and mixed CSV/XLSX rows | Upload, preview, correct errors, cancel one import, confirm another. | Row-level validation is clear; cancel writes nothing; confirmation imports only valid accepted rows once. |
| ADM-07 | Student import / P1 | Malformed/oversized/unsupported file | Upload invalid file and inspect error response. | File is rejected safely; no partial records are created; actionable error is shown. |

## Accounts, roles and invitations

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADM-08 | Accounts / P1 | Existing accounts with multiple role states | Search/filter by name, email, role, status and scope. | Matching accounts/counts are correct; no-match/reset works. |
| ADM-09 | Accounts / P0 | Authorized System Admin | Create valid account invitation with permitted role and scope. | Invitation is created once; assigned role/scope is explicit; delivery status and audit event are visible. |
| ADM-10 | Accounts / P1 | Account form | Submit missing/invalid name/email, duplicate email, invalid role or missing scope. | Invalid account is rejected with field-level errors; no partial account or invitation is created. |
| ADM-11 | Accounts / P0 | Existing account | Change role/scope; attempt prohibited escalation or invalid combination. | Authorized changes persist and are audited; invalid role/scope change is rejected. |
| ADM-12 | Accounts / P1 | Pending invite | Resend then revoke invitation; open old links. | Resend/revoke state is reflected; revoked or superseded token cannot activate account. |
| ADM-13 | Accounts / P1 | Active account | Disable/reactivate account if supported; test existing session and new sign-in. | Access follows updated status; operation is auditable and does not grant extra roles. |

## Faculty, departments and programs

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADM-14 | Faculties / P1 | Faculty list exists | Search/list faculties; create, edit and cancel a faculty change. | CRUD operations target the correct faculty; cancel writes nothing; saved changes persist and are audited. |
| ADM-15 | Departments / P1 | Departments assigned to faculties | Create/edit department and change faculty relationship. | Department belongs to selected faculty; required values and uniqueness are enforced. |
| ADM-16 | Faculties/departments / P1 | Faculty/department with dependent records | Attempt deletion with and without dependencies. | Dependency policy is enforced; confirmation identifies target; unrelated records are not silently deleted. |
| ADM-17 | Programs / P1 | Programs across organization/status | Search/filter by code/name/faculty/department/status. | Results/counts match filters; empty state and reset work. |
| ADM-18 | Programs / P1 | Valid program data | Create program with unique code/name, organization, duration and status. | Program is created once with correct derived organization and persists after refresh. |
| ADM-19 | Programs / P1 | Invalid/duplicate program data | Submit missing/duplicate values, missing department, invalid duration/status. | Validation blocks invalid save and identifies fields; no malformed program is persisted. |
| ADM-20 | Programs / P1 | Existing program | Edit fields, cancel, save, then delete with cancel/confirm. | Cancel preserves record; save updates intended row; confirmed deletion follows dependency rules and is audited. |

## Settings and audit log

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADM-21 | Settings / P1 | Current settings values | Inspect warning/probation/dismissal thresholds, sender address and backup metadata. | Current server values and labels display accurately. |
| ADM-22 | Settings / P1 | Valid threshold and sender values | Save valid values; reload settings. | Values persist and are used by relevant workflows; success is shown only after server confirmation. |
| ADM-23 | Settings / P1 | Invalid threshold combinations/address | Test boundaries, decimal/non-numeric values, ordering and malformed/unsupported sender address. | Invalid combinations are rejected; prior saved settings remain unchanged. |
| ADM-24 | Settings / P1 | Backup record action available | Record a backup event; inspect status and audit history. | Metadata is recorded with actor/time; UI does not claim a backup artifact exists unless one was created. |
| ADM-25 | Audit log / P1 | Events from several actors/actions | Filter by person, student, action and date; inspect details. | Results match filters and permitted scope; event detail is readable and immutable. |
| ADM-26 | Audit log / P1 | No matching events | Apply impossible filter/date range then reset. | Empty state appears; reset restores scoped events. |
| ADM-27 | Audit log / P0 | Attempt edit/delete or unauthorized export | Use available controls/API. | Audit records are immutable; export/view permission is enforced and logged where required. |

## Notifications, account security and shared behavior

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADM-28 | Notifications / P1 | Read/unread notifications | Inspect All/Unread, counts, mark all read and follow target. | Read state persists; counts update; target route is correct and authorized. |
| ADM-29 | Change password / P1 | Local-password admin account | Test wrong current, mismatch and password policy boundaries. | Invalid values are rejected; no password mutation occurs. |
| ADM-30 | Change password / P0 | Valid new password | Change, then sign in with old and new password; inspect other active session. | New credential works; old credential fails; session revocation follows policy. |
| ADM-31 | Navigation / P0 | Anonymous, Admin and non-admin sessions | Directly open admin URLs, refresh, sign out and revisit. | Only authorized admin role reaches protected routes; sign-out ends access. |
| ADM-32 | Persistence / P1 | Save account, org, program and setting changes | Navigate away, reload and inspect related counts/audit events. | Confirmed operations persist once and related views remain consistent; failed/canceled operations leave no change. |
| ADM-33 | Error handling / P1 | API timeout, validation error and permission denial | Exercise list and mutation flows under each response. | Errors are clear; no false success or partial mutation; retry does not create duplicates. |
| ADM-34 | Responsive/accessibility / P1 | Desktop/mobile, keyboard and 200% zoom | Operate navigation, filters, tables, forms and dialogs. | Controls remain usable, labeled and keyboard accessible; focus is visible and content is not clipped. |
| ADM-35 | Safety/privacy / P0 | HTML-like text and secret values in test input | Render text and inspect URLs, errors and visible logs. | Text is inert; credentials/tokens and unrelated personal data are not exposed. |

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

Record each case as **Not run**, **Pass**, **Fail**, **Blocked**, or **Not applicable**. For failures, include expected/actual result, screen, synthetic fixture, timestamp and evidence. Scenarios without an available page or action should be marked **Blocked** until the administration workflow is available for execution.

## Source basis

System Administration acceptance scenarios follow `Software Requirements Specification (SRS).md`, `contract/openapi.yaml`, and the administration screen definitions. The current route exposes the System Administration portal entry shell and System Operations summary; the feature scenarios define expected acceptance behavior for the documented administration workflows.
