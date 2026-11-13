# Department Head mock screens

Department Head pages run inside the shared authenticated layout and use
fictional records for the workflows below. Adviser changes, settings, and demo audit
events stay in browser memory as you move between screens. Reload the app to
restore the sample data.

Adviser Assignments is the Department Head's tool for assigning students to
advisers. The Adviser sidebar group links to the shared `/adviser` portal for
accounts with an independent Adviser assignment. The current Adviser portal is
the auth team's scaffold. The Students checklist preview uses a shared checklist component
and follows the read-only workflow in the SRS. Opening it leaves the audit event count
unchanged.

## Run locally

```sh
npm ci
VITE_API_MODE=mock npm run dev
```

Open the URL printed by Vite. In the Dev Persona switcher, select **Dept Head
Only** or **Dept Head + Adviser**, then use the sidebar or open these paths
directly. The Adviser group appears for the second persona. The breadcrumbs
and notification bell are in the shared top bar.

| Screen | Path | What to try |
| --- | --- | --- |
| Students | `/department-head/students` | Search by name or student ID, filter the roster, and open a read-only sample checklist. Use Preview spreadsheet import to see fixed examples. The preview does not read or upload the selected file. |
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
form records metadata in memory. The Department Head preview actions use browser memory. They perform no real
imports, email delivery, or backups.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```
