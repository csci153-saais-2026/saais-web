# OpenAPI 0.4.1 candidate

Status: **pending review**. Approval is for the complete `0.4.1` bundle against the `0.3.1` baseline on `dev`. The intermediate `0.4.0` candidate covered assistant history and photo staging. This record includes both changes and the [grade-scale decision in #213](https://github.com/csci153-saais-2026/saais-web/issues/213#issuecomment-7221198225).

- Bundled contract SHA-256: `4f35a518d60e01ba088f68b44d4704c51af2d4172d899eaacbe1407e7f88064e`. Recompute with `node contract/candidate-hash.cjs`.
- Frontend approval of this version and hash: pending.
- Backend approval of this version and hash: pending.

- Assistant history adds `GET /functions/v1/students/{student_id}/assistant`. It returns up to 20 saved messages for the current or former adviser who authored the conversation. The existing scoped RPC remains callable during the transition.
- Photo updates require a fresh `students/<student_id>/upload-<uuid>.<ext>` staging key with a MIME-matching extension. Clients that send reusable paths such as `avatar.png` must change before rollout.
- Grade entry, term encoding, import preview and commit, and ordinary corrections accept midterms from `1.00` through `5.00` in `0.25` steps. Grade flag corrections follow the stored stage. Final-stage and unspecified-stage flags, finals, and INC completions accept `1.00` through `3.00` in quarter steps or `5.00`. Older request senders must stop sending intermediate grades for those fields. Prerequisite overrides require a passing grade. Outside credit, blank grades, and status-only values keep their existing rules.
- Consumers must handle intermediate grades from `3.25` through `4.75` in midterms and midterm flag corrections.

## Rollout

1. Record frontend and backend approval of the complete version and bundle hash before promoting the integration changes to `dev`.
2. Run `supabase/tools/preflight-grade-scale.sql` against the staging and production targets before applying the grade migration. The production preflight on 2026-11-28 returned zero in all three bands requested by #213 and zero violations of the exact proposed checks. Record the staging counts before rollout. If any rows would violate a check, agree on handling with the team before deployment. The migration validates the checks without rewriting historical grades.
3. Once the bundle is approved, regenerate `supabase/functions/_shared/contract.json` and `academic-contract.json` from that pinned revision and hash. Generate the corresponding database contract snapshots in a forward migration. Replace the temporary hand-written assistant history operation with the generated entry while keeping the dedicated, caller-authenticated history RPC dispatch. Run the pinned snapshot, Edge, and SQL tests to verify both runtime layers use the approved schemas.
4. Apply `20261128000600_split_midterm_and_final_grade_scales.sql` and the approved snapshot updates before deploying the corresponding frontend, or coordinate them in one release. Verify the wider midterm range, final rejections, assistant history, and photo staging against the migrated backend before publishing the approved docs.
