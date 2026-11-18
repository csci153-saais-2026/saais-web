# TC-04 — Adviser resolves an INC before its deadline

**Role:** Adviser
**Shared personas/data:** adviser and an assigned student with an unresolved INC and a future deadline.
**Mockup sources:** mockup/Adviser/AdviseeGrades.dc.html, AdviserEncodeGrades.dc.html, AdviserDashboard.dc.html.

## Preconditions

- The INC attempt and deadline exist in the shared academic record.
- The selected term is available for the completion action.

## Steps and expected results

1. Open the student’s Grades tab and locate the INC attempt. The course, INC status, and deadline match the shared data.
2. Choose Resolve INC and enter a valid completion grade with the required reason.
3. Save the completion. The record displays the completion result and resolved status.
4. Review the transcript/history. The original INC attempt remains visible with its completion history; it is not deleted or overwritten.
5. Review the displayed GWA and checklist. They reflect the completion outcome according to the mockup’s record summary.

## Review checks

- Do not assume a late-completion policy not stated by the mockup or an approved project decision.
- A completion action is attributable to the adviser and appears in audit history.
- QA approval: [ ] Adviser/academic-rule reviewer approval: [ ]

**Execution status:** Automated prototype coverage: an unresolved INC can be completed and its attempt remains displayed. Deadline enforcement, role authorization, and contract audit persistence are not tested.
