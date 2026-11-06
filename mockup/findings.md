# Findings

- Existing source of truth: `_gen/base.py`, five Python page generators, `_gen/build-prototype.js`, `_gen/shell-template.html`.
- 27 generated artboards are stitched into prototype.html; many fields are divs and many actions are unbound.
- Reference inspected: https://www.stellic.com/ on 2026-09-19. Current visual uses spacious cream surfaces, large editorial serif headings, rounded controls, strong product illustrations and restrained navigation. Retain SAAIS palette and translate the hierarchy into operational screens.
- SRS read in full. Schema contains 18 entities; use SRS scope when optional section/schedule fields conflict.
- Existing RecordAttempt page permanently renders its warning overlay. It must open only on submission with an unsatisfied strict prerequisite.
- Existing exception text incorrectly says decisions cannot be edited; SRS requires audited edit/revoke.
- Existing dates, metrics and partial datasets are illustrative; do not claim server-side enforcement.
- Workspace is not a Git repository.
