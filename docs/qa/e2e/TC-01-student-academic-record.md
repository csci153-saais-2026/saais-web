# TC-01 — Student reviews their academic record

**Role:** Student
**Shared personas/data:** student or another existing student persona with checklist, grades, and advising notes.
**Mockup sources:** mockup/Student/StudentDashboard.html, StudentChecklist.html, StudentGrades.html, StudentHistory.html, StudentNotifications.html.

## Preconditions

- The student account is active and has an assigned adviser, curriculum, attempts, and at least one active and one archived advising note.
- Use an existing shared student record; do not create test-only records.

## Steps and expected results

1. Sign in as the selected student and open the dashboard. The student sees their own academic summary and no other student’s private record.
2. Open the checklist. Requirements, units, status, satisfaction source, and attempts match the shared record. Filtering changes only the visible requirement rows.
3. Open grades and enrollment history. The student can review their own term records and grade flags; no grade-entry or grade-correction controls are available.
4. Open the student-visible notes view. Active and archived notes belonging to this student are readable. Archiving a note does not make it invisible to the student.
5. Open notifications. The list contains notifications addressed to this account, not another student’s notifications.

## Review checks

- Confirm student-safe information is shown and staff-only controls/details are absent.
- Confirm the archived note stays visible to the student, per the project owner’s clarification.
- QA approval: [ ] Role reviewer approval: [ ]

**Execution status:** Automated prototype coverage: student dashboard, notes panel, checklist, grades, history, and inbox. The prototype does not distinguish archived notes or enforce cross-account privacy.
