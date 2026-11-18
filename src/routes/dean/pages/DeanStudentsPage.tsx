import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeading } from "@/components/features/page-heading"
import { getDeanFaculties, getDeanStudents } from "@/routes/dean/api/dean.api"
import { DeanQueryState } from "@/routes/dean/components/DeanQueryState"
import { DeanStudentRecordDialog } from "@/routes/dean/components/DeanStudentRecordDialog"
import { StudentDirectoryFilters } from "@/routes/dean/components/StudentDirectoryFilters"
import { StudentDirectoryTable } from "@/routes/dean/components/StudentDirectoryTable"
import type { DeanStudentSummary } from "@/routes/dean/types"
import { toDeanStudentSummary } from "@/routes/dean/utils/to-dean-student-summary"

export default function DeanStudentsPage() {
  const [query, setQuery] = useState("")
  const [curriculum, setCurriculum] = useState("all")
  const [adviser, setAdviser] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<DeanStudentSummary | null>(null)

  const studentsQuery = useQuery({
    queryKey: ["dean", "students"],
    queryFn: async () => {
      const [roster, faculties] = await Promise.all([
        getDeanStudents(),
        getDeanFaculties(),
      ])
      return { roster, faculties }
    },
  })

  const facultyName = useMemo(() => {
    return (
      studentsQuery.data?.roster.items[0]?.faculty_name ??
      studentsQuery.data?.faculties[0]?.name ??
      "Faculty of Computing"
    )
  }, [studentsQuery.data])

  const students = useMemo(
    () => (studentsQuery.data?.roster.items ?? []).map(toDeanStudentSummary),
    [studentsQuery.data],
  )

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
      <PageHeading
        title="Students"
        subtitle={`${facultyName} · opening a record is logged`}
      />

      {!studentsQuery.data ? (
        <DeanQueryState
          isLoading={studentsQuery.isLoading}
          isError={studentsQuery.isError}
          label="students"
          onRetry={() => void studentsQuery.refetch()}
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
