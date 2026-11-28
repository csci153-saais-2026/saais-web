# OpenAPI 0.4.1 candidate

Status: **pending review**. This patch implements the [grade-scale decision in #213](https://github.com/csci153-saais-2026/saais-web/issues/213#issuecomment-7221198225).

- Bundled contract SHA-256: `4f35a518d60e01ba088f68b44d4704c51af2d4172d899eaacbe1407e7f88064e`. Recompute with `node contract/candidate-hash.cjs`.
- Frontend approval of this version and hash: pending.
- Backend approval of this version and hash: pending.

Grade entry, term encoding, import preview and commit, and ordinary corrections accept midterms from `1.00` through `5.00` in `0.25` steps. Grade flag corrections follow the stored stage. Final-stage and unspecified-stage flags, final grades, and INC completion grades keep the `1.00` through `3.00` quarter steps and `5.00` rule. Prerequisite overrides require a passing grade. Outside-credit and blank or status-only grades keep their existing rules.

This is compatible for request senders using `0.4.0`. Consumers reading newly saved grades should support `3.25` through `4.75` in midterm fields and in midterm-stage flag corrections.

## Rollout

1. Record the two approvals for the same version and bundle hash before merging.
2. Record the staging and production counts requested in #213 for final grades, INC completion grades, and final-stage corrected grades from `3.25` through `4.75`. The read-only production preflight on 2026-11-28 returned zero for all three counts. Capture staging counts before applying the migration and proceed only when they are also zero. The migration validates the existing final and INC constraints and creates a validated stage-aware flag constraint. It does not rewrite stored grades, and it will fail if any stored value violates those checks.
3. Apply `20261128000600_split_midterm_and_final_grade_scales.sql` before deploying the frontend, or deploy both together as one coordinated release. Verify the wider midterm range and final-grade rejections against the migrated backend, then publish the `0.4.1` docs and enable the wider range in the frontend.
