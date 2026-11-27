import { useEffect, useState, type ComponentProps } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { StudentRecordHeader } from "@/components/features/student-record-header";
import { postDeanAuditViewEvent } from "@/routes/dean/audit-log/audit-log.api";
import type { DeanStudentSummary } from "@/routes/dean/types";

function computeInitials(name: string): string {
  const parts = name.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

/**
 * Coordinates the shared `StudentRecordDialog` state for Dean portals: resets the active
 * tab to `"checklist"` when the selected student changes, logs the `"student_record_viewed"`
 * audit event, and maps `DeanStudentSummary` to `StudentRecordHeader` props.
 */
export function useDeanStudentRecordDialog(
  student: DeanStudentSummary | null,
): {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  headerStudent: ComponentProps<typeof StudentRecordHeader> | null;
} {
  const queryClient = useQueryClient();
  const currentStudentId = student?.studentId ?? null;
  const studentNumber = student?.studentNumber ?? null;

  const [tabState, setTabState] = useState<{
    studentId: string | null;
    tab: string;
  }>({ studentId: currentStudentId, tab: "checklist" });

  const activeTab =
    tabState.studentId === currentStudentId ? tabState.tab : "checklist";

  const setActiveTab = (tab: string) => {
    setTabState({ studentId: currentStudentId, tab });
  };

  useEffect(() => {
    if (!currentStudentId || !studentNumber) return;
    void postDeanAuditViewEvent({
      event_type: "student_record_viewed",
      student_id: currentStudentId,
      details: `Viewed student academic record (${studentNumber})`,
    })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["dean", "audit-log"] }),
      )
      .catch(() => undefined);
  }, [currentStudentId, studentNumber, queryClient]);

  const headerStudent: ComponentProps<typeof StudentRecordHeader> | null =
    student
      ? {
          name: student.name,
          initials: student.initials.trim() || computeInitials(student.name),
          studentNumber: student.studentNumber,
          program: student.program,
          yearLabel: student.yearLabel,
          email: student.email,
          standing: student.standing,
        }
      : null;

  return {
    activeTab,
    setActiveTab,
    headerStudent,
  };
}
