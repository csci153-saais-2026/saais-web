# Adviser test cases

All cases are **Not run**. These cases describe expected Adviser pages and workflows. The contract branch does not register Adviser routes; mark UI-dependent cases, including ADV-33, Blocked until the relevant page is available in the revision under test. Use authorized test accounts and synthetic student records. For writes, verify the response, UI state, and persistence after refresh. Confirmed rejections must leave data unchanged; after a timeout, reconcile the saved record before retrying because the outcome is indeterminate.

## Dashboard

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-01 | Dashboard / P1 | Adviser with assigned students and multiple terms | Inspect advisee summary, GWA/standing/deficiency cards, term selector and quick links. | Metrics reflect authorized advisees and selected term; links open the matching Adviser pages. |
| ADV-02 | Dashboard / P1 | Deficiency list and PDF export available | Open deficiency drill-down; preview, close, then download report. | Correct scoped students/courses appear; closing preview downloads nothing; exported report reflects selected scope. |
| ADV-03 | Dashboard / P2 | Empty/no-alert result | Inspect zero-data cards, charts, INC reminders and recent activity. | Empty states render without errors, invalid numeric values or misleading alerts. |
| ADV-04 | Dashboard / P1 | Service error or slow response | Load dashboard while API is delayed or unavailable; retry after service recovery. | Loading and error states are clear; retry displays current data without duplicate requests/actions. |

## Advisees

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-05 | Advisees / P1 | Current and past assigned students | Switch Current/Past; search full/partial name and ID; filter standing; combine and reset. | Correct rows/counts and no-match state; past students are identified read-only; reset restores defaults. |
| ADV-06 | Advisees / P1 | Students with different standing, flags and deficiencies | Inspect row values and open each authorized student. | ID, curriculum, standing, GWA, flags and deficiency details match service data; intended student workspace opens. |
| ADV-07 | Advisees / P0 | Current, past and unrelated student IDs | Open authorized records; try unrelated/guessed student URL and edit action on past record. | Current assigned access follows Adviser permissions; past access is read-only; unrelated records are denied without data disclosure. |
| ADV-08 | Advisees / P1 | Search/filter state | Apply several filters, paginate if available, refresh, and clear filters. | Filters compose correctly; paging/counts remain consistent; invalid stale selection is safely cleared. |

## Student checklist

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-09 | Checklist / P1 | Requirements across statuses | Filter status; expand/collapse terms; use Collapse all; open Course info for attempted and empty slots. | Matching rows, effective status/source, units, attempts and details appear; controls behave consistently. |
| ADV-10 | Checklist / P1 | Direct pass, equivalency, elective mapping, repeats and INC | Inspect satisfaction source, grade, units, attempts and grade-fix history. | Source/result matches academic record; earlier attempts remain visible; student-facing view omits staff-only remarks. |
| ADV-11 | Checklist / P1 | Checklist PDF export | Preview, close, reopen and download. | Preview precedes download; cancel creates no file; PDF has correct student/course context, signatories and unofficial-record notice. |
| ADV-12 | Checklist / P1 | API failure while checklist loads | Load with service error, then retry. | Error/retry state appears; no partial or cross-student checklist is shown. |

## Student grades

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-13 | Grades / P1 | Multiple terms, grades and flags | Inspect term ordering, grades/status/GWA; open flags and Flag Grade dialog. | Values and flag states match records; dialog identifies intended course and recorded grade. |
| ADV-14 | Grades / P1 | Course without open flag | Submit blank details; submit each supported reason with missing then valid detail; try duplicate open flag. | Required detail is validated; valid flag is saved once and appears under review; duplicate open flag is prevented. |
| ADV-15 | Grades / P1 | Corrected and rejected flags | Refresh after resolution and inspect grade/status/response. | Corrected grade and status update; rejection response is visible and grade remains unchanged. |
| ADV-16 | Grades / P1 | Grade-summary PDF | Preview, cancel, then download. | PDF contains correct student/term rows; canceled preview does not download. |
| ADV-17 | Grades / P1 | Flag service failure | Submit a flag while API fails, then retry after recovery. | Failure is clear; no duplicate flag is created; successful retry produces one record. |

## Student curriculum and advising

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-18 | Curriculum / P1 | Current/target curriculum | Inspect assignment history; preview shifts for available targets and cancel. | Target-specific carried/lost units and GWA are shown; preview does not modify assignment or credit decisions. |
| ADV-19 | Curriculum / P1 | Eligible target and existing pending request | Submit without reason, submit valid request, then try duplicate target. | Missing reason/duplicate is rejected; valid request is recorded once as pending; assignment awaits authorized decision. |
| ADV-20 | Advising / P1 | Recommendations across terms/prerequisite states | Change term; inspect offerings, reasons, badges, exclusions and retakes. | Recommendations reflect selected-term offerings and eligibility; completed, enrolled or unavailable courses are excluded. |
| ADV-21 | Advising / P1 | Empty and populated plan | Save empty plan; select courses and save; revisit, revise and save. | Empty plan is rejected; valid plan persists once for intended student/term; plan does not create enrollment. |
| ADV-22 | Advising / P1 | Assistant and selected student context | Ask supported, unsupported, cross-student and grade-change questions. | Answer remains in selected context; assistant does not mutate academic records; privacy boundaries are respected. |

## Student notes and audit log

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-23 | Advising notes / P1 | Existing note history | Add blank/whitespace then valid note; inspect recent and View all; archive/restore where available. | Empty note is rejected; valid note shows author/date; prior text/provenance remains; archive state/count updates. |
| ADV-24 | Student notes / P1 | Existing notes and attempt remarks | Append a note; try to edit/delete prior entries; inspect staff-only attempt remarks. | New note is appended; earlier content is retained; restricted remarks remain hidden. |
| ADV-25 | Audit log / P1 | Multiple events for authorized students | Filter actor, student, category and date; inspect details and empty state. | Matching authorized events/details appear; unrelated student audit data is not exposed. |

## Encode grades

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-26 | Encode / P1 | Multiple students, terms and offerings | Change student/term; search/add regular and elective course; enter instructor; remove staged row. | Correct scoped offerings load; selection validates; removed staged row is not saved. |
| ADV-27 | Encode / P1 | New enrollment with blank/midterm grades | Save blank grades; enter midterm, cancel confirmation; repeat and confirm. | Blank creates valid enrolled state where permitted; cancel writes nothing; confirmation records one attempt/grade. |
| ADV-28 | Encode / P1 | Grade values and DR/INC cases | Test allowed numeric values/boundaries, INC, DR and NA; inspect calculated status. | Only valid choices accepted; final grade drives status; paired grade and INC controls follow rules. |
| ADV-29 | Encode / P1 | Existing attempt with saved grade | Submit unchanged/blank values; attempt grade correction from this workflow. | Existing attempt is not erased; correction follows grade-flag workflow; history is retained. |
| ADV-30 | Encode / P1 | Strict, co-requisite and recommended prerequisites | Trigger each prerequisite condition; cancel override; try blank and valid reason. | Required prerequisite blocks or requests documented override; cancel/blank reason writes nothing; valid override is recorded; advisory types do not block. |
| ADV-31 | Encode / P1 | Open/closed encoding terms and pending INC | Attempt normal write in closed term; resolve timely/late INC if supported. | Service policy is enforced and explained; no unauthorized lock override or out-of-deadline completion occurs. |
| ADV-32 | Encode / P0 | Save request timeout or server error | Submit grade, lose response, reload and inspect record before retry. | Result is reconciled before retry; no duplicate attempt or false success is shown. |

## Import grades, grade flags and notifications

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-33 | Import / P1 | JSON template/sample | Download template; load sample; upload via file chooser or drag/drop. | Template and preview work; no write occurs before confirmation. |
| ADV-34 | Import / P1 | Invalid JSON and rows | Test malformed/empty/wrong-shape file, unknown student/offering, locked term, invalid increment and DR pairing. | Parse and row-specific errors are clear; invalid rows are not saved; all-invalid import cannot be committed. |
| ADV-35 | Import / P1 | Mixed valid/invalid rows | Preview and cancel one file; confirm another; revisit grade/history. | Cancel writes nothing; only accepted rows are saved; repeated confirmation does not duplicate attempts. |
| ADV-36 | Flags / P1 | Open grade flag | Fix with missing grade/reason then valid grade/reason; inspect student grade/totals. | Required values enforced; successful fix updates flag and grade consistently and records audit event. |
| ADV-37 | Flags / P1 | Open grade flag | Reject with empty reply then meaningful reply. | Reply is required; valid rejection closes flag, preserves grade and records decision. |
| ADV-38 | Flags / P2 | All flags resolved/rejected | Inspect list and counts. | Empty open-flags state and zero count appear accurately. |
| ADV-39 | Notifications / P1 | Read/unread notifications | Open bell/page; switch All/Unread; mark all read and follow a target. | Counts/read state update through service; target opens intended screen; empty state appears. |

## Account, navigation and accessibility

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| ADV-40 | Change password / P1 | Local-password account | Test wrong current value, mismatch, policy boundaries and valid new password. | Invalid values show feedback; valid change succeeds, fields clear and session policy is applied. |
| ADV-41 | Navigation / P0 | Adviser, non-Adviser and anonymous sessions | Open Adviser routes directly; sign out and retry protected URL. | Assigned role is admitted; other/anonymous users are denied; sign-out ends session and returns to sign-in. |
| ADV-42 | Responsive/accessibility / P1 | Desktop/mobile, keyboard and zoom | Use navigation, dialogs, tables, filters and forms at narrow width/200% zoom. | Controls remain usable and labeled; focus is visible; no critical overlap or clipped content. |

## Run record

```text
Run ID:
Environment/browser:
Tester/date:
Test account/fixture (synthetic identifier only):
Passed / Failed / Blocked:
Defects and notes:
```

Record each case as **Not run**, **Pass**, **Fail**, **Blocked**, or **Not applicable**. For failures, include expected/actual result, screen, synthetic fixture, timestamp and evidence.
