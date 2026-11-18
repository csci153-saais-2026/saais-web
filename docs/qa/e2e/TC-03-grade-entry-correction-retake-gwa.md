# TC-03 — Adviser records/corrects grades and verifies retake GWA behavior

**Role:** Adviser
**Shared personas/data:** adviser and an assigned student with gradeable work. A failed course with a pending retake is needed for the retake portion.
**Mockup sources:** mockup/Adviser/AdviserEncodeGrades.dc.html, AdviseeGrades.dc.html, AdviserGradeFlags.dc.html.

## Preconditions

- The selected term is open for grade encoding under the student’s current department.
- The shared record includes all data needed by this case: a separate gradeable attempt, a flagged grade that can be corrected, a previously passed course, and one course with a failed attempt plus an unposted retake. The student has not passed the course being retaken.
- Use one selected shared student record for the entire scenario. Do not use the pending retake as the gradeable attempt in steps 1–3.

## Steps and expected results

1. Open Encode Grades, choose the assigned student and term, and select a gradeable attempt that is separate from the failed course’s pending retake.
2. Enter a valid grade on the mockup’s grade scale and save. The grade appears in the student’s term record and the displayed cumulative GWA is recalculated. The pending retake remains unposted.
3. Open a flagged grade and correct it with a reason. The corrected value is shown, and the correction reason appears in the audit history.
4. Try to add a course the student already passed. The system prevents a passed course from being retaken.
5. After the correction in step 3 and before grading the retake, calculate and record the expected cumulative GWA from the shared record: sum each counted grade multiplied by its units, divided by the total counted units, rounded to two decimal places. Include the original failing attempt and exclude the unposted retake. Compare this expected value with the displayed GWA.
6. Post a numeric result for the retake. Recalculate the expected cumulative GWA from the same shared record and formula, replacing the original failing attempt with the new result. The old failing attempt remains on the transcript marked as repeated and excluded from cumulative GWA; the new result is counted. Compare this expected value with the displayed GWA.

| GWA checkpoint | Counted grades × units / total counted units | Expected cumulative GWA |
| --- | --- | --- |
| Before retake result | Fill from shared record after step 3; include prior fail, exclude unposted retake | Calculate and record before execution |
| After retake result | Use the same record, replacing prior fail with the posted retake grade | Calculate and record before execution |

## Review checks

- Grade correction is auditable and requires a reason.
- A failed course may be retaken; a passed course may not.
- Use the mockup’s displayed GWA behavior; do not require an additional semestral-GWA presentation.
- If the shared mock database has no single student record satisfying all preconditions, or the expected-value table cannot be filled from that record, this case is blocked pending the shared mock-data owner’s fixture. Do not invent a case-local dataset or guess GWA values.
- QA approval: [ ]  Adviser/academic-rule reviewer approval: [ ]

**Execution status:** Specification only; not yet run. The current shared seed has no pre-seeded repeated-course/retake result, so it does not currently provide the failed attempt with an unposted retake required here. Execution remains blocked until the shared mock-data owner supplies one record that also meets the flagged-grade and previously-passed-course preconditions. Calculate both expected GWA values from that record before execution.
