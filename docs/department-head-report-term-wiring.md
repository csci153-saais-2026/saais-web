# Department Head Reports and Academic Terms wiring

This note describes the Department Head Reports and Academic Terms updates on
`refactor/department-head-shared-wiring`. The pages now use reusable components
from `src/components/features/` while keeping their current route behavior.

## Reports

`DepartmentReportsPage` prepares the display values from the existing report
model. It passes statistics and the grade distribution to `ReportStatsSection`,
cohorts to `CohortGwaTable`, and the selected cohort's student rows to
`CohortStudentsDialog`.

The report model still owns enrollment totals, GWA calculations and the selected
term/program. A cohort is looked up by its ID in the currently displayed report;
changing filters clears the selection. The dialog returns focus to its opener
when closed. Student names remain read-only text in this Department Head view.
The Department Summary stays in a separate panel.

## Academic Terms

`AcademicTermsPage` supplies the existing `AcademicTermRecord` rows to
`AcademicTermsTable`. Its callbacks return a display row, so the page finds the
original full record by ID before opening the existing close or details dialog.
The Head workflow still has close and view actions. It does not gain reopen or
edit controls from this refactor.

The Add Term form, validation, close confirmation and department-scoped API
mutations remain in the page. Term details show the recorded closer when the API
provides one and display “Not recorded” when it does not; the UI no longer
supplies a sample person's name.

## PDF previews

Both pages pass the generated `DepartmentPdfDocument` to
`useDepartmentPdfUrl`, then give the shared `PdfViewerDialog` the title,
filename, URL and error state. The hook loads letterhead details within the
current Department Head scope, creates the PDF and temporary browser URL, and
releases the URL when the selection changes or the page unmounts. It also ignores
late results and cancels an obsolete metadata request so a previous selection's
preview is not shown for a new scope.

The shared viewer only displays the prepared PDF and offers an explicit download.
The pages and hook continue to own data retrieval and PDF creation.

The old `document`/`onClose` dialog interface remains as a small compatibility
adapter because Department Staff Academic Terms still imports it. The adapter
uses the shared preparation hook and delegates display to the shared viewer.

## Scope and verification record

This change adds no API contract, database, role permission or calculation
changes. Reports, terms and PDF preparation use the existing typed API/model.

Focused tests were run separately during the work: 34 report/shared-component
cases, 10 Academic Terms/shared-table cases, and 3 term-details cases passed in
their respective runs. The PDF hook has focused tests for preparation, errors,
request cancellation and URL cleanup; its implementation report noted initial
hook checks passing. These runs predate the final combined branch state; confirm
the combined result in CI before merging.
