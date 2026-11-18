# TC-08 — Department Head records outside credit and equivalency decisions

**Role:** Department Head
**Shared personas/data:** department_head, an existing student, the shared course catalog, and existing credit/equivalency records.
**Mockup sources:** mockup/Department Head/OutsideCredits.dc.html, Equivalence.dc.html, Curricula.dc.html, Students.dc.html.

## Preconditions

- The student belongs to the acting Head’s permitted department.
- A legitimate source course and target curriculum subject are available.

## Steps and expected results

1. Open Outside Credits and start a credit decision for the student.
2. Enter an outside course, units, grade, source institution, equivalent subject, and reason.
3. Submit a passing grade at the supported boundaries, 1.00 and 3.00. Each is accepted and appears in the student’s credit/checklist history with an audit record.
4. Try a failing grade above 3.00. The credit is rejected with validation; it is not counted as earned units or checklist completion.
5. Create an equivalency between the selected curricula. The mapping is scoped to that curriculum pair; matching course codes alone do not make differently titled courses equivalent.
6. Revoke a mapping/decision, where the mockup provides that action. Past reports retain their historical results; current and future calculations exclude the revoked credit.

## Review checks

- Only passing outside-credit grades from 1.00 through 3.00 are accepted.
- Keep the existing shared catalog titles and codes.
- Past reports are preserved when a mapping is revoked.
- QA approval: [ ]  Department Head/academic reviewer approval: [ ]

**Execution status:** Specification only; not yet run. Do not infer a revocation UI if none exists in the current mockup.
