# TC-09 — Adviser records additional-credit repeatable offerings

**Role:** Adviser
**Shared personas/data:** adviser and an assigned student/curriculum with an additional-credit repeatable course or elective slot.
**Mockup sources:** mockup/Adviser/AdviserEncodeGrades.dc.html, AdviseeGrades.dc.html, mockup/Student/StudentChecklist.html.

## Preconditions

- The shared curriculum identifies a repeatable additional-credit offering.
- The student’s checklist and existing attempts are available.

## Steps and expected results

1. Open Encode Grades, select the assigned student and term, then record a passing result for one eligible offering.
2. Record a second and third distinct offering for the same additional-credit course, following the curriculum’s additional-credit rule.
3. Open the student checklist and confirm all passed offerings count toward earned units and cumulative GWA, including passes beyond the number needed to fill the elective requirement.
4. Attempt to record a retake of a course the student has already passed. The action is rejected; additional-credit offerings do not make ordinary passed courses retakable.
5. Revoke an elective mapping/equivalency, if applicable. Previously generated reports remain historical; the current checklist and future calculations exclude the revoked credit.

## Review checks

- Distinguish an explicitly additional-credit repeatable offering from an ordinary already-passed course.
- Preserve past reports and transcript history.
- QA approval: [ ]  Adviser/academic-rule reviewer approval: [ ]

**Execution status:** Automated prototype coverage: adviser attempt and checklist views. The prototype does not identify additional-credit-repeatable offerings or expose the related retake/GWA policy actions.
