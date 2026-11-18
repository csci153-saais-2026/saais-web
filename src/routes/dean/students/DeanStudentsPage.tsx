import { useMemo, useState } from "react"
import { PageHeading } from "@/components/features/page-heading"
import { DeanQueryState } from "@/routes/dean/shared/DeanQueryState"
import { DeanStudentRecordDialog } from "@/routes/dean/students/DeanStudentRecordDialog"
import { StudentDirectoryFilters } from "@/routes/dean/students/StudentDirectoryFilters"
import { StudentDirectoryTable } from "@/routes/dean/students/StudentDirectoryTable"
import { useDeanStudents } from "@/routes/dean/students/use-dean-students"
import type { DeanStudentSummary } from "@/routes/dean/types"

export default function DeanStudentsPage() {
  const [query, setQuery] = useState("")
  const [curriculum, setCurriculum] = useState("all")
  const [adviser, setAdviser] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<DeanStudentSummary | null>(null)

  const {
    students,
    hasData,
    facultyName,
    isLoading,
    isError,
    isFacultyUnavailable,
    refetch,
  } = useDeanStudents()

  const curriculumOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.curriculum))).sort(),
    [students],
  )
  const adviserOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.adviser))).sort(),
    [students],
  )

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return students.filter((student) => {
      const matchesQuery =
        normalized === "" ||
        `${student.name} ${student.studentNumber}`.toLowerCase().includes(normalized)
      const matchesCurriculum =
        curriculum === "all" || student.curriculum === curriculum
      const matchesAdviser = adviser === "all" || student.adviser === adviser
      return matchesQuery && matchesCurriculum && matchesAdviser
    })
  }, [students, query, curriculum, adviser])

  const handleReset = () => {
    setQuery("")
    setCurriculum("all")
    setAdviser("all")
  }

  return (
    <div className="space-y-6">
      <PageHeading title="Students" subtitle={facultyName ?? undefined} />

      {!hasData || isLoading || isError || isFacultyUnavailable ? (
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

          <StudentDirectoryTable
            students={filteredStudents}
            totalCount={students.length}
            onSelectStudent={setSelectedStudent}
            onResetFilters={handleReset}
          />
        </div>
      )}

      <DeanStudentRecordDialog
        key={selectedStudent?.studentId ?? "closed"}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  )
}
