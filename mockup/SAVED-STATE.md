# Saved state in the mock-up

Everything you do in the role portals is kept in the browser (`localStorage`), so it survives a reload, carries across pages, and shows up in every portal that reads the same record. Nothing is sent anywhere.

**Start over:** open any page with `?reset-demo` (for example `prototype.html?reset-demo`). It clears every `saais-*` key and reloads.

| Key | What it holds | Written by | Read by |
|---|---|---|---|
| `saais-adviser-ui-v1` | Encoded grades, resolved INCs, imported rows, grade corrections, notes, curriculum-transfer endorsements, term plans | Adviser portal (and the Head / Dean copies of the adviser screens) | Adviser pages, Student Grades and Checklist, Head transfer queue |
| `saais-grade-flags` | Grade flags a student files and the adviser's decision | Student portal, adviser Grade flags | Both |
| `saais-mgmt-v1` | Reassignments, closed and new terms, transfer decisions, equivalencies, outside credits, imported students | `portal-actions.js` (Head, Staff, Dean-Head) | Head, Staff, Dean, Admin, adviser Curriculum tab, Student Curriculum history |
| `saais-accounts-v1` | Provisioned accounts | Staff Accounts, Admin Accounts | Staff and Admin |
| `saais-settings-v1` | Standing thresholds, sender address, last backup | Head and Admin Settings | Head and Admin Settings |
| `saais-admin-ui-v1` | Programs, faculties, departments | System Admin | System Admin |
| `saais-audit-v1` | The audit trail: one entry per change | Every portal (`saais-audit.js`) | Head, Dean, Admin audit logs and each advisee's Audit log tab |
| `saais.curricula`, `saais.newCourses`, `saais.courseCatalog` | Curriculum versions, new courses, the course catalog | Head / Staff Curricula and Course catalog | Same |
| `saais-session-keep` | "Keep me signed in" on the live login | `prototype.html` | `prototype.html` |

If `localStorage` is blocked, the screens fall back to in-memory state for that tab.

## Not connected

- Encode grades covers four advisees (Ana, Ben, Dino, Maria). Only Maria has a Student portal, so only her grades, GWA, units, year standing, deficiencies, standing and resolved INC flow into the Student pages, the advisee pages, the roster and the adviser dashboards (`saais-metrics.js`).
- Student imports read `.xlsx` and `.csv`. Old binary `.xls` files are rejected with a message.
- The five combined workspace pages (`Adviser.dc.html`, the Head, Dean and Dean-Head copies, and `SystemAdmin.dc.html`) were brought level with the standalone pages and tested screen by screen.
