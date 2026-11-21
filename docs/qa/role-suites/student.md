# Student test cases

All cases are **Not run**. The Student portal route is not registered in the contract branch; its portal entry shell and Academic Progress & Checklist summary are unavailable there. The scenarios below provide acceptance coverage for the Student workflows defined in the requirements, API contract and screen design. Use authorized test accounts and synthetic records; where a workflow is not yet available in the app, record it as Blocked rather than treating a design-only result as a pass.

## Portal entry and dashboard

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STU-01 | Portal entry / P0 | Active Student account | Sign in and open Student portal. | Student role reaches its own portal shell; another role's navigation/data is not exposed. |
| STU-02 | Portal entry / P1 | Student portal loaded | Inspect heading, Academic Progress & Checklist summary and navigation. | Entry content is clear; visible links open the correct Student pages; unavailable feature links are not presented as working. |
| STU-03 | Dashboard / P1 | Student has active term, adviser and academic records | Inspect greeting, quick access, recommendations, degree progress and reminders. | Identity, progress, adviser and reminders match the authenticated Student's records and selected term. |
| STU-04 | Dashboard / P1 | Advising notes and assignment history exist | Open and close each history/detail view. | Only the signed-in Student's notes and dated adviser history are shown; details are read-only. |
| STU-05 | Dashboard / P1 | Empty or unavailable data | Load with no records and with service timeout/error. | Empty/loading/error states are understandable; retry recovers without showing stale or another student's data. |

## Curriculum checklist

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STU-06 | Checklist / P1 | Curriculum with multiple terms and requirements | Inspect summary tiles, filters, terms and course rows. | GWA, counted units, standing, deficiencies, status/source, units and attempts match academic records. |
| STU-07 | Checklist / P1 | Requirements in passed/credited, INC, enrolled and not-taken states | Filter each status and restore All. | Only matching requirements remain; no-result state is clear; counts update consistently. |
| STU-08 | Checklist / P1 | Several curriculum terms | Expand/collapse individual terms and Collapse all. | Term controls accurately reflect expanded state and remain stable when repeated. |
| STU-09 | Checklist / P1 | Courses with zero, one and multiple attempts | Open Course info. | Dialog shows course, units, curriculum position, status, attempts, grades, term and result; empty attempt state is clear. |
| STU-10 | Checklist / P1 | Repeated failure and grade-fix history | Inspect attempt and fix history. | Earlier attempts remain; student-facing fix description is safe; staff-only correction reason is hidden. |
| STU-11 | Checklist / P1 | Checklist PDF available | Preview, cancel, then download. | Preview matches current student/course data; cancel downloads nothing; PDF carries unofficial-record notice. |
| STU-12 | Checklist / P0 | Another student's known ID/URL | Change route or request to target other student record. | Access is denied; no identity, grades or checklist data are revealed. |

## Grades and enrollment history

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STU-13 | Grades / P1 | Multiple terms and grade statuses | Inspect term order, grades, failed units, status and GWA. | Values match recorded grades and are ordered consistently by academic term. |
| STU-14 | Grades / P1 | Course without open flag | Open Flag Grade and cancel. | Form identifies intended course/record; cancel creates no flag. |
| STU-15 | Grades / P1 | Course without open flag | Submit blank detail; try each supported reason; submit valid detail. | Required detail is validated; valid flag is submitted once; grade remains unchanged while under review. |
| STU-16 | Grades / P1 | Existing open flag | Try a duplicate flag and inspect another course. | Duplicate open flag is prevented; other eligible courses remain flaggable. |
| STU-17 | Grades / P1 | Corrected/rejected flag exists | Refresh grades and open flag details. | Corrected grade/status or rejection response is shown; rejected flag does not alter grade. |
| STU-18 | Grades / P1 | Grade summary PDF available | Preview, cancel and download. | PDF reflects visible student terms/grades; canceled preview creates no file. |
| STU-19 | Enrollment history / P1 | Attempts across terms | Inspect enrollment records and result statuses. | Attempt history is complete, preserves repeats and has a clear empty state. |
| STU-20 | Grades / P0 | Student requests another student's grade route | Open route/API request for other student. | Access is denied with no record details exposed. |

## Profile and curriculum history

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STU-21 | Profile / P1 | Student profile exists | Inspect photo, name, ID, email, role, program, department, college and curriculum. | Values match authenticated account and academic records; non-editable identity fields cannot be changed. |
| STU-22 | Profile / P1 | Valid JPG/PNG within size limit; invalid/oversized alternatives | Upload, replace and remove photo; try invalid files. | Valid image saves and persists; removal restores default; unsupported/oversized file is rejected with feedback. |
| STU-23 | Profile / P1 | Adviser and curriculum assignment history exists | Open each history view. | Dated history is accurate and read-only; dialogs close without changing assignments. |
| STU-24 | Profile / P1 | Photo upload API failure | Upload valid file during service error and retry. | Error is visible; prior photo remains; successful retry updates once. |

## Notifications and password

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STU-25 | Notifications / P1 | Read/unread items exist | Open All/Unread, follow target link and revisit. | Counts and read state reflect service; target opens related page; empty state appears when appropriate. |
| STU-26 | Notifications / P1 | Unread items exist | Mark all as read; refresh and inspect All/Unread. | Unread count updates persistently; All retains history. |
| STU-27 | Change password / P1 | Local-password account | Test wrong current password, policy boundaries, mismatch and same-as-current. | Invalid input is identified; password remains unchanged. |
| STU-28 | Change password / P0 | Valid new password | Change password; sign in with old then new credential. | New password works; old password is rejected; success and session revocation behavior are correct. |
| STU-29 | Change password / P1 | Password form controls | Toggle password visibility and cancel/back. | Visibility control is accessible; cancel returns to Student portal without mutation. |

## Shared behavior

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| STU-30 | Persistence / P1 | Create flag, update profile photo and mark notification read | Reload relevant pages and revisit each record. | Successful changes persist for the same Student; canceled/failed actions do not persist. |
| STU-31 | Navigation / P0 | Anonymous, Student and non-Student sessions | Open Student routes directly, refresh and use back/forward. | Student access is guarded; sign-in return path works only for authorized route; role boundaries hold. |
| STU-32 | Dialogs/accessibility / P1 | Open dialogs and use keyboard/narrow viewport | Close through supported controls; test focus, labels, Escape and 200% zoom. | Dialog behavior is consistent; focus is managed; controls remain labeled and usable. |
| STU-33 | Safety/privacy / P0 | Notes or content with harmless HTML-like text; inspect network/error states | Render content and review visible errors. | Text is inert; errors/log-facing UI do not expose secrets, internal tokens or unrelated student data. |

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

Record each case as **Not run**, **Pass**, **Fail**, **Blocked**, or **Not applicable**. For failures, include expected/actual result, screen, synthetic fixture, timestamp and evidence. Scenarios without an available page or action should be marked **Blocked** until the Student workflow is available for execution.

## Source basis

The Student acceptance scenarios follow `Software Requirements Specification(SRS).md`, `contract/openapi.yaml`, and the Student screen definitions. The portal entry shell and Academic Progress & Checklist summary are not available on the contract branch; the scenarios define expected acceptance behavior for the documented Student workflows.
