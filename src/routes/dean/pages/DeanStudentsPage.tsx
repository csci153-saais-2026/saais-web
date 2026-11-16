import { useMemo, useState } from "react"
import { PageHeading } from "@/components/features/page-heading"
import { SampleFooter } from "@/components/features/sample-footer"
import { StudentDirectoryFilters } from "@/routes/dean/components/StudentDirectoryFilters"
import { FACULTY_STUDENTS } from "@/routes/dean/data/faculty-students"

export default function DeanStudentsPage() {
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

  const handleReset = () => {
    setQuery("")
    setCurriculum("all")
    setAdviser("all")
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

      <SampleFooter>Fictional sample records · Reference date: 28 October 2026</SampleFooter>
    </div>
  )
}
