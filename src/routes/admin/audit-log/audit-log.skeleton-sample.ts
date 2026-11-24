import { layoutSample, sampleRows } from "@/components/features/skeleton-sample";
import type { AuditLogRow } from "./admin-audit-model";

/** Layout-only audit rows so the table can be measured on first visit. */
export const ADMIN_AUDIT_SKELETON_SAMPLE: AuditLogRow[] = sampleRows(10, (i) =>
  layoutSample<AuditLogRow>({
    id: `sample-${i}`,
    actor_name: "Sample Person",
    actor_role: "admin",
    student_name: "Sample Student Name",
    student_number: "2021-00000",
    target_label: "Student record",
    action: "viewed",
    action_category: "view",
    entity_type: "student",
    details_summary: "Viewed the student's grades",
    created_at: "2026-01-01T08:00:00Z",
  }),
);
