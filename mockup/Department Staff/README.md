# Department Staff static design

Open `index.html` in this folder. The sidebar links these five pages:

- Students: name/ID search, curriculum/adviser filters, spreadsheet import and illustrative ID validation.
- Adviser assignments: student selection, bulk reassignment preview, Since and Previous adviser columns.
- Academic terms: open/closed semesters, term details, add-term and close-encoding previews.
- Curricula: all active versions, including older versions with enrolled students, plus student counts and opened subjects with prerequisite types and co-requisites. The “Read only” label is omitted. Existing versions cannot be edited; creation and rename controls are omitted.
- Accounts and roles: the SystemAdmin Accounts and roles layout, scoped to the department. The People table shows names, VSU email addresses, and multiple role badges. Add account opens a full-name/VSU-email form with role checkboxes and illustrative validation.

These files use the local `../DesignSystem.dc.html` palette, typefaces, and component shapes. Design alignment changes are confined to the Department Staff and Department Head folders.

The shell and component measurements now match the existing Student, Adviser, and Admin portals in `../prototype.html`: 250px sidebar, 62px breadcrumb header, 30px headings, compact tables, status dots, signed-in user menu, and mobile navigation drawer with stacked table cards. `portal-shell.js` handles the shared presentation controls. This visual alignment also applies to Department Head; the existing Student, Adviser, and Admin files were not edited.

Everything is static and uses fictional data for an academic snapshot dated 15 August 2025. Forms, decisions, invitations, spreadsheets, and role changes do not save or transmit data. Spreadsheet validation examples are illustrative; no file parsing takes place. Student table counts explicitly distinguish sample records from the larger department totals.

To regenerate markup, edit `build-pages.cjs`, then run `node "Department Staff/build-pages.cjs"` from the project root. The generator is self-contained and writes only this folder. Styling and presentation interactions are in `department-staff.css` and `department-staff.js`.

The external reference site could not be loaded through the available browsing tool. The supplied role requirements and local design system were used.

The Accounts and roles revamp uses `../SystemAdmin/AdminAccountsRoles.dc.html` as its local design reference. Adviser assignment selection controls are grouped at the right of the assignment toolbar. These revisions modify Department Staff only.
