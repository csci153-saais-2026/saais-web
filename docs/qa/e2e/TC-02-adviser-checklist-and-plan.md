# TC-02 — Adviser reviews prerequisites and saves an advising plan

**Role:** Adviser
**Shared personas/data:** adviser and a student currently assigned to that adviser.
**Mockup sources:** mockup/Adviser/AdviserAdvisees.dc.html, AdviseeChecklist.dc.html, AdviseeAdvising.dc.html, AdviseeNotes.dc.html.

## Preconditions

- The adviser has a current assignment to the selected student.
- The shared curriculum includes at least one unmet requirement and a prerequisite relationship that can be inspected.

## Steps and expected results

1. Sign in as the adviser and open the advisee roster. The assigned student appears.
2. Open the student’s checklist and inspect a requirement with an outstanding prerequisite. The status/source and attempt history match the shared academic record.
3. Open Advising, select a term, and review recommended courses. Recommendations reflect the selected student’s unmet requirements and prerequisite results; the adviser can inspect before recording enrollment.
4. Select a recommendation and add it to the term plan. The saved plan is associated with this student and term.
5. Write and save an advising note. The note appears in the student’s note history and is visible to the student.
6. Open the assistant preview if available. Show its demo-preview state and the agreed “AI can make mistakes” caution. Suggestions remain advisory; the assistant does not record enrollment or change academic data without a separate approved action.

## Review checks

- An adviser cannot open or change a student outside their permitted assignment/scope.
- No enrollment is recorded merely by viewing recommendations or asking the preview assistant.
- Archived notes remain student-visible.
- QA approval: [ ] Adviser/product reviewer approval: [ ]

**Execution status:** Automated prototype coverage: prerequisite recommendations, local term-plan save, note save, and an assistant-caution text check. The test does not open the assistant or verify its visible preview state, and it does not test API persistence or authorization.
