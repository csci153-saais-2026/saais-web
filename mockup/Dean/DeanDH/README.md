# Department Head static design

The Dean DH sidebar groups navigation into collapsible **Adviser**, **Department Head**, and **Dean** sections. The current page's role starts expanded. Icons and spacing match the Dean Adviser portal, and the upper-right workspace switch is removed. `navigation.cjs` keeps generated management navigation consistent with these sections.

Open `index.html` in this folder to start. All ten pages are linked from the Department Head sidebar and can also be opened individually as `*.dc.html` files.

The pages follow the palette, typography, components, and spacing of `../DesignSystem.dc.html`. Only Department Head files are included; the existing runtime and other role pages are untouched.

The shell and component measurements now match the existing Student, Adviser, and Admin portals in `../prototype.html`: 250px sidebar, 62px breadcrumb header, 30px headings, compact tables, status dots, signed-in user menu, and mobile navigation drawer with stacked table cards. `portal-shell.js` handles the shared presentation controls. Department Staff uses the same shell and CSS; all role-specific content remains within its own folder.

These are static HTML designs with fictional records. JavaScript provides presentation-only dialogs, directory and audit filters, multi-selection, and cohort drill-downs. Approval, rejection, forms, uploads, backup records, and term closure never write or transmit data. Spreadsheet validation examples are illustrative. Academic Terms and Department Reports export local PDF downloads with searchable text and paginated tables. `pdf-export.js` generates them from the visible sample content without opening the print dialog or calling an external service.

The sample academic snapshot is 15 August 2025, independent of today's date. Counts illustrate a larger department; table samples and report drill-down samples are explicitly labeled.

`build-pages.cjs` generates the ten HTML pages and local entry point. To update generated markup, edit that file and run `node "Department Head/build-pages.cjs"` from the project root. CSS and interaction previews live in `department-head.css` and `department-head.js`.

Settings markup comes from `settings-layout.html`. `audit-settings.css` and `audit-settings.js` provide the matching Audit / Settings layout in both Department Head and SystemAdmin. Audit filters search the acting person and affected student independently. The threshold card spans the full width; Email and Backups occupy equal-height columns below it.

The external reference prototype could not be loaded with the available browsing tools. The supplied feature requirements and local design system were used as references.
