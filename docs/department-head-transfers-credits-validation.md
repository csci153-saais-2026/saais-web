# Curriculum Transfers and Outside Credits validation

Verified on 18 November 2026 in the separate `codex/dh-transfers-credits` worktree.

## Git preservation and integration

- Base: `bd089a65a1ec1b644d73eb7785e353e1df28a96e` from `origin/feat/department-head-ui`.
- All 16 teammate commits listed in the request are ancestors of HEAD.
- Before integration, the only commit unique to `codex/dh-jd-catalog-foundation` relative to the remote PR branch was `45bc283941592dfbd485507b5af2f705ba13acde`.
- Its actual diff only adds `docs/department-head-implementation-guide.md`.
- `git merge --no-ff --no-commit 45bc283` applied without conflicts and was finalized with user approval as `f7a20dd044f6e81e56aea5abca4b85901db3dc1f`. Its parents are the remote PR base `bd089a6` and guide commit `45bc283`; the merge changes only the implementation guide relative to its first parent.
- The guide matches the original commit exactly and is now an ancestor of this branch. The merge is complete; there is no pending MERGE_HEAD. Implementation contributions were committed separately after the guide-only integration. No pushes were performed.
- The original checkout remains on `codex/dh-jd-catalog-foundation` with only its original unstaged integration-test modification. That edit was not copied, staged, committed, or changed.
- Original integration-test SHA256: `78E8566E3B7659B65A07C19D1CD831C0E95399653BB29AAC3869E959F7ABE188`.

## Local commit record

The user approved the complete local commit process after the final read-only review.

| Commit | Subject | Scope |
| --- | --- | --- |
| `f7a20dd044f6e81e56aea5abca4b85901db3dc1f` | Merge implementation guide into department head work | Guide-only normal merge |
| `01756fdee7be36c1bb07072a18ba9ee35491bd71` | fix(department-head): complete curriculum transfer review and coverage | Four transfer page/API/test files and only the transfer-decision validation hunk in handlers.ts |
| `868a80a7d4efe16bc5c2911daa9c454db26ca4ba` | fix(department-head): complete outside credit validation and coverage | Five outside-credit page/API/test files and only the outside-credit POST validation hunk in handlers.ts |
| `d01c340beb1965f4e71c61e7c8af8e4501db096d` | fix(mocks): enable explicitly configured mock production previews | One-line main.tsx guard change |

The separate documentation commit containing this report follows those four commits. Shared-handler changes were selectively staged, inspected before committing, and verified afterward. No amendments, resets, rebases, or pushes were used. Application source was not changed during the commit process; the test and preview results below describe the previously validated implementation.

## Focused changes

- Reused DataTablePanel for transfer pending/history and outside-credit records.
- Applied page-scoped reference table spacing, plain grade alignment, identity cells, count/scope footers, and explicit empty states.
- Corrected both dialogs to 680px on desktop with viewport margins and scrolling on narrow screens.
- Prevented repeated submissions while writes are pending and retained usable failure feedback.
- Preserved the existing transfer transaction and outside-credit persistence write. Persistence was already supplied by `32b7ee2`.
- Added contract-based request, role, department, reference, duplicate-source, and occupied-slot checks to the outside-credit POST block. Added decision/reason validation to the transfer decision block.
- Replaced single 100-row collection reads with contract-supported limit/offset traversal, stable ordering, explicit safe projections, and the documented 100,000 offset bound. The existing paginated roster read remains in use.
- Resolved missing optional transfer endorser names through typed profile reads using the actual endorser ID and the contract's 50-ID filter bound.
- With separate user approval, changed one guard in main.tsx so explicitly configured mock production builds can start the existing MSW worker. External API configuration still bypasses the worker as before.
- Curricula, its API/dialogs/handlers, other page folders, shared UI components, mock store/personas, contracts, manifests, and lockfile were not modified.

## Automated validation

All commands used `VITE_API_MODE=mock` where applicable, on Node 24.13.0 and npm 11.6.2.

| Check | Actual result |
| --- | --- |
| Transfers, credits, shared MSW handlers, API client, and AuthProvider tests | 8 files, 112 tests passed |
| Outside-credit tests after the final mobile row grouping correction | 3 files, 34 tests passed |
| npm run typecheck | Passed after the final source change |
| npm run lint | Passed after the final source change |
| npm run build | Passed after the final source change; large-chunk warnings remain |
| git diff --check | Passed |

The whitespace result above covers the unstaged implementation diff during validation. The final read-only review also ran `git diff --cached --check` on the staged guide; it flagged 22 pre-existing two-space Markdown hard-break endings. The guide was preserved exactly as approved.

Coverage includes successful decisions, approval roster changes, rejection reasons, later reads, duplicate decisions, credit creation identity/persistence, invalid requests, permissions, duplicate/satisfied slots, loading/errors/retry, pending submissions, retained form values, empty states, and reads beyond 100 records.

The first approval UI test used a click-only event for a Radix tab. It was corrected to mouseDown; the subsequent regression run passed. This was a test interaction issue.

`npm ci` failed because the existing lockfile omits `@emnapi/wasi-threads@1.2.3`. Dependencies were installed with `npm install --no-package-lock --no-audit --no-fund --prefer-offline` after one network-reset retry. Both manifests remain unchanged. These results therefore do not establish that the existing lockfile supports a clean reproducible install.

The full repository test suite and all unrelated DH pages were not tested.

## Production preview

Used the built app at `http://127.0.0.1:4175`, authenticated through the existing mock department-head persona.

- Direct DH routes load after the approved explicit-mock startup correction.
- Verified rejection reason validation, saved rejection/history, and approval/history updates.
- Verified actual endorser names in the review flow.
- Created CS 205 / Algorithms against the existing open CSCI 153 slot; the records refetch showed two credits and 6.25 recognized units. Navigating away and back retained the created record through another API-backed read.
- Desktop dialogs measured 680px. Header padding measured 10px 14px and body padding 11px 14px.
- At a 390px viewport, both dialogs kept approximately 16px side margins without horizontal content overflow. Verified stacked record layout and grouped course/units content after the final correction.
- Browser viewport overrides were reset after verification.

MSW persistence is the existing in-memory database lifetime; a full reload reinitializes it. Cross-reload storage was not introduced or claimed.

## Owner follow-ups outside the edited blocks

- Existing shared GET `/rest/v1/outside_credit` and `/rest/v1/curriculum_transfer_request` handlers filter student personas to their own records, but return the full mock collections for other allowed roles. Department/faculty/adviser scope enforcement is missing in these read-handler blocks despite contract scope declarations. These blocks were left unchanged under the endpoint ownership safeguards. This remains a known limitation of the shared mocks, rather than a complete authorization signoff.
- The outside-credit GET role allowlist also omits contract-supported `department_staff`. JD should coordinate an explicitly designated shared MSW/API authorization owner with the affected portal owners; these GET blocks were not included in the assigned POST/decision ownership exceptions.
- The existing shared query helper does not apply `order` or `select`. The new pagination tests verify traversal beyond 100 records, not sorting or projection fidelity in MSW. This shared helper remains unchanged.
- The Curricula owner should verify visual and behavioral consistency with Department Staff Curricula where applicable. No Curricula takeover or external message was performed.
- The existing lockfile clean-install failure and build chunk-size warnings remain for their respective owners.
