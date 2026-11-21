# OpenAPI 0.3.1 freeze record

Status: **frozen** on 2026-11-21. Department Staff and Department Heads can clone when both source and target are within their assigned department. Admin-only accounts still require an independently assigned in-scope Head or Staff role to clone.

The previous approved baseline remains [OpenAPI 0.3.0](FREEZE-0.3.0.md). This authorization expansion changes behavior and must not be presented as covered by the 0.3.0 approvals.

- Frozen bundled SHA-256: `4be525583cfa343782e00e3c1daee087da92a213734e7ba75ff00006f5418d6f`.
- Frontend representative: [@mteraaa approved the version and hash](https://github.com/csci153-saais-2026/saais-web/pull/111#pullrequestreview-6005340031) on 2026-11-21.
- Backend representative: [@staagatajd approved the version and hash](https://github.com/csci153-saais-2026/saais-web/pull/111#pullrequestreview-6006041872) on 2026-11-21.
- Both approvals reviewed commit `c80825f280b6a0bb2a49925519d5b877f8c57bfc`; PR #111 was merged into `feat/contract-mock` in commit `8df551183962d19ab724c9f33c9a5f6d884d3ba5`.

The bundled hash identifies the contract and its referenced files, not this record. Backend implementations and deployed clients must adopt the revised authorization rule explicitly; the specification alone does not implement or deploy it. The Staff mockup control also requires an update to reflect the new decision.
