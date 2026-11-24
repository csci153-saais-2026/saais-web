import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { DEAN_STUDENTS_SKELETON_SAMPLE } from "../dean.skeleton-samples";
import { useMemo, useState } from "react";
import { PageHeading } from "@/components/features/page-heading";
import { StudentRecordDialog } from "@/components/features/student-record-dialog";
import { DeanQueryState } from "@/routes/dean/shared/DeanQueryState";
import { DeanStudentAuditTab } from "@/routes/dean/students/DeanStudentAuditTab";
import { DeanStudentChecklistTab } from "@/routes/dean/students/DeanStudentChecklistTab";
import { DeanStudentGradesTab } from "@/routes/dean/students/DeanStudentGradesTab";
import { StudentDirectoryFilters } from "@/routes/dean/students/StudentDirectoryFilters";
import { StudentDirectoryTable as SharedStudentDirectoryTable } from "@/components/features/student-directory-table";
import { useDeanStudentRecordDialog } from "@/routes/dean/students/use-dean-student-record-dialog";
import { useDeanStudents } from "@/routes/dean/students/use-dean-students";
import type { DeanStudentSummary } from "@/routes/dean/types";

export default function DeanStudentsPage() {
  const [query, setQuery] = useState("");
  const [curriculum, setCurriculum] = useState("all");
  const [adviser, setAdviser] = useState("all");
  const [selectedStudent, setSelectedStudent] =
    useState<DeanStudentSummary | null>(null);
  const recordDialog = useDeanStudentRecordDialog(selectedStudent);

  const {
    students: loadedStudents,
    hasData,
    facultyName,
    isLoading,
    isError,
    isFacultyUnavailable,
    refetch,
  } = useDeanStudents();
  // While loading, the skeleton is measured from sample rows.
  const students = isLoading ? DEAN_STUDENTS_SKELETON_SAMPLE : loadedStudents;

  const curriculumOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.curriculum))).sort(),
    [students],
  );
  const adviserOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.adviser))).sort(),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery =
        normalized === "" ||
        `${student.name} ${student.studentNumber}`
          .toLowerCase()
          .includes(normalized);
      const matchesCurriculum =
        curriculum === "all" || student.curriculum === curriculum;
      const matchesAdviser = adviser === "all" || student.adviser === adviser;
      return matchesQuery && matchesCurriculum && matchesAdviser;
    });
  }, [students, query, curriculum, adviser]);

  const handleReset = () => {
    setQuery("");
    setCurriculum("all");
    setAdviser("all");
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Students" subtitle={facultyName ?? undefined} />

      {(!hasData && !isLoading) || isError || isFacultyUnavailable ? (
        <DeanQueryState
          isLoading={isLoading}
          isError={isError}
          isEmpty={isFacultyUnavailable}
          label="students"
          emptyTitle="Faculty unavailable"
          emptyMessage="Faculty information is unavailable for this account."
          onRetry={refetch}
        />
      ) : (
        <AccountSkeleton
          id="dean-students"
          loading={isLoading}
          measured
          label="Loading students…"
        >
          <div className="space-y-4">
            <StudentDirectoryFilters
              query={query}
              onQueryChange={setQuery}
              curriculum={curriculum}
              onCurriculumChange={setCurriculum}
              curriculumOptions={curriculumOptions}
              adviser={adviser}
              onAdviserChange={setAdviser}
              adviserOptions={adviserOptions}
              onReset={handleReset}
            />

            <SharedStudentDirectoryTable
              students={filteredStudents}
              totalCount={students.length}
              onSelectStudent={setSelectedStudent}
              onResetFilters={handleReset}
            />
          </div>
        </AccountSkeleton>
      )}

      <StudentRecordDialog
        open={selectedStudent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null);
        }}
        student={recordDialog.headerStudent}
        activeTab={recordDialog.activeTab}
        onActiveTabChange={recordDialog.setActiveTab}
      >
        {selectedStudent && recordDialog.activeTab === "checklist" && (
          <DeanStudentChecklistTab student={selectedStudent} />
        )}
        {selectedStudent && recordDialog.activeTab === "grades" && (
          <DeanStudentGradesTab student={selectedStudent} />
        )}
        {selectedStudent && recordDialog.activeTab === "audit" && (
          <DeanStudentAuditTab student={selectedStudent} />
        )}
      </StudentRecordDialog>
    </div>
  );
}
