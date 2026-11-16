import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { PageHeading } from "@/components/features/page-heading"
import { SampleFooter } from "@/components/features/sample-footer"
import { StudentDirectoryFilters } from "@/routes/dean/components/StudentDirectoryFilters"
import { StudentDirectoryTable } from "@/routes/dean/components/StudentDirectoryTable"
import { FACULTY_STUDENTS } from "@/routes/dean/data/faculty-students"
import type { DeanStudentSummary } from "@/routes/dean/types"

export default function DeanStudentsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [curriculum, setCurriculum] = useState("all")
  const [adviser, setAdviser] = useState("all")

  const curriculumOptions = useMemo(
    () => Array.from(new Set(FACULTY_STUDENTS.map((s) => s.curriculum))).sort(),
    [],
  )
  const adviserOptions = useMemo(
    () => Array.from(new Set(FACULTY_STUDENTS.map((s) => s.adviser))).sort(),
    [],
  )

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return FACULTY_STUDENTS.filter((student) => {
      const matchesQuery =
        normalized === "" ||
        `${student.name} ${student.studentNumber}`.toLowerCase().includes(normalized)
      const matchesCurriculum =
        curriculum === "all" || student.curriculum === curriculum
      const matchesAdviser = adviser === "all" || student.adviser === adviser
      return matchesQuery && matchesCurriculum && matchesAdviser
    })
  }, [query, curriculum, adviser])

  const handleReset = () => {
    setQuery("")
    setCurriculum("all")
    setAdviser("all")
  }

  const handleSelectStudent = (student: DeanStudentSummary) => {
    navigate(`/dean/students/${encodeURIComponent(student.studentNumber)}`)
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Students"
        subtitle="Faculty-wide read-only directory across constituent departments."
      />

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
        onSelectStudent={handleSelectStudent}
      />

      <SampleFooter>Fictional sample records · Reference date: 28 October 2026</SampleFooter>
    </div>
  )
}
