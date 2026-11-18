# TC-03 — Adviser records/corrects grades and verifies retake GWA behavior

**Role:** Adviser
**Shared personas/data:** adviser and an assigned student with gradeable work. A failed course with a pending retake is needed for the retake portion.
**Mockup sources:** mockup/Adviser/AdviserEncodeGrades.dc.html, AdviseeGrades.dc.html, AdviserGradeFlags.dc.html.

## Preconditions

- The selected term is open for grade encoding under the student’s current department.
- Shared records include a failed course and a retake without a posted result; the student has not passed the course previously.

## Steps and expected results

1. Open Encode Grades, choose the assigned student and term, and select a course. The selected student/term/course remain associated with the saved grade.
2. Enter a valid grade on the mockup’s grade scale and save. The grade appears in the student’s term record and the displayed cumulative GWA is recalculated.
3. Open a flagged grade and correct it with a reason. The corrected value is shown, and the correction reason appears in the audit history.
4. Try to add a course the student already passed. The system prevents a passed course from being retaken.
5. Review the pending retake. Until it has a result, the prior failing grade continues to count in cumulative GWA.
6. Post a numeric result for the retake. The old failing attempt remains on the transcript, marked as repeated and excluded from cumulative GWA; the new result is counted.

## Review checks

- Grade correction is auditable and requires a reason.
- A failed course may be retaken; a passed course may not.
- Use the mockup’s displayed GWA behavior; do not require an additional semestral-GWA presentation.
- QA approval: [ ]  Adviser/academic-rule reviewer approval: [ ]

**Execution status:** Specification only; not yet run. Confirm the shared dataset has the pending failed-course retake scenario before execution; if not, request that scenario from the shared mock-data owner.
