# Department Head mock screens

These five screens run inside the shared Department Head layout and use the
team’s fictional student roster. Adviser changes, settings, and demo audit
events stay in browser memory as you move between screens. Reload the app to
restore the sample data.

Adviser Assignments is the Department Head's tool for assigning students to
advisers. The Adviser sidebar group is separate. Its links currently open
placeholders for the Adviser team's shared screens. The Students checklist
preview uses a shared checklist component and follows the read-only workflow in
the SRS. Opening it leaves the audit event count unchanged.

## Run locally

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. After the routes are wired, use the Department
Head sidebar or open these paths directly.

| Screen | Path | What to try |
| --- | --- | --- |
| Students | `/department-head/students` | Search by name or student ID, filter the roster, and open a read-only sample checklist. Choose a CSV or XLSX file to see example validation results. |
| Adviser Assignments | `/department-head/adviser-assignments` | Filter and select students, then reassign them with a reason and an effective date. Select-all applies to the visible rows. |
| Department Reports | `/department-head/reports` | Change the term and program, open a cohort’s student details, and download a PDF for the selected report. |
| Audit Log | `/department-head/audit-log` | Filter the sample events by actor, student, action, or date. Dates and timestamps use Philippine time. |
| Settings | `/department-head/settings` | Edit sample scholastic standing thresholds and sender preferences, or record sample backup details. |

## Smoke check

1. Reassign a sample student using today’s date. Check that Students shows the
   new adviser and Audit Log has a reassignment event. Try a future date to see
   a scheduled change. This demo displays scheduled changes without activating
   them later.
2. Export a report PDF and confirm the term and program match your selections.
   Select the term labeled as having no sample data to check the empty state.
3. Save a setting and check for a demo change event in Audit Log. Reload and
   check that the sample defaults are restored.

The spreadsheet dialog shows fixed validation examples. Report totals and GWA
use sample data, and the PDF is generated locally. Settings shows proposed
notification triggers for adviser reassignment, curriculum-transfer decisions,
and grade-encoding closure. Saving a setting only updates the demo. The backup
form records metadata in memory. The mock makes no API calls and performs no
real imports, email delivery, or backups.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```
