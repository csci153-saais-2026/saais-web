import { useState } from "react";
import { StudentRecordDialog as SharedStudentRecordDialog } from "@/components/features/student-record-dialog";
import type { DirectoryStudent } from "../shared/students-types";
import { AuditTab } from "./AuditTab";
import { ChecklistTab } from "./ChecklistTab";
import { GradesTab } from "./GradesTab";

const RECORD_TABS = {
  checklist: ChecklistTab,
  grades: GradesTab,
  audit: AuditTab,
};

/** Read-only student record; each tab loads its own department-scoped data. */
export function StudentRecordDialog({
  student,
  onClose,
  returnFocusTo,
}: {
  student: DirectoryStudent;
  onClose: () => void;
  returnFocusTo: HTMLButtonElement | null;
}) {
  const [activeTab, setActiveTab] =
    useState<keyof typeof RECORD_TABS>("checklist");
  const Tab = RECORD_TABS[activeTab];
  const initials = student.name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <SharedStudentRecordDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      recordLabel="Student record"
      student={{
        name: student.name,
        initials,
        studentNumber: student.studentNumber,
        curriculum: student.curriculum,
        yearLabel: student.yearStanding,
        email: student.email,
      }}
      activeTab={activeTab}
      onActiveTabChange={(tab) => {
        if (tab === "checklist" || tab === "grades" || tab === "audit") {
          setActiveTab(tab);
        }
      }}
      returnFocusTo={returnFocusTo}
    >
      <Tab student={student} />
    </SharedStudentRecordDialog>
  );
}
