import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeading } from "@/components/features/page-heading"
import type { Status } from "@/components/ui/status-badge"
import type { ApiSchema } from "@/lib/api"
import { getDeanStudents } from "@/routes/dean/api/dean.api"
import { DeanQueryState } from "@/routes/dean/components/DeanQueryState"
import { DeanStudentRecordDialog } from "@/routes/dean/components/DeanStudentRecordDialog"
import { StudentDirectoryFilters } from "@/routes/dean/components/StudentDirectoryFilters"
import { StudentDirectoryTable } from "@/routes/dean/components/StudentDirectoryTable"
import type { DeanStudentSummary } from "@/routes/dean/types"

const YEAR_LABELS: Readonly<Record<number, string>> = {
  1: "1st Year",
  2: "2nd Year",
  3: "3rd Year",
  4: "4th Year",
}

function getInitials(name: string): string {
  const parts = name
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "ST"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

function mapStanding(
  item: ApiSchema<"StudentRosterItem">,
): Extract<Status, "good" | "flagged" | "delinquent"> {
  if (item.is_delinquent || item.standing === "probation" || item.standing === "dismissed") {
    return "delinquent"
  }
  if (item.standing === "warning" || item.open_flags_count > 0) {
    return "flagged"
  }
  return "good"
}

function toDeanStudentSummary(item: ApiSchema<"StudentRosterItem">): DeanStudentSummary {
  return {
    studentId: item.student_id,
    studentNumber: item.student_number,
    name: item.full_name,
    initials: getInitials(item.full_name),
    departmentId: item.department_id,
    department: item.department_name,
    curriculum: item.curriculum_label,
    adviser: item.adviser_name ?? "Unassigned",
    program: item.program_name,
    yearLabel: YEAR_LABELS[item.year_level] ?? `${item.year_level}th Year`,
    email: item.email,
    standing: mapStanding(item),
    gwa: typeof item.gwa === "number" ? item.gwa.toFixed(2) : "—",
    unitsEarned: item.earned_units,
    unitsRequired: item.required_units,
    entryYear: item.entry_year,
  }
}

export default function DeanStudentsPage() {
  const [query, setQuery] = useState("")
  const [curriculum, setCurriculum] = useState("all")
  const [adviser, setAdviser] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<DeanStudentSummary | null>(null)

  const studentsQuery = useQuery({
    queryKey: ["dean", "students"],
    queryFn: getDeanStudents,
  })

  const students = useMemo(
    () => (studentsQuery.data?.items ?? []).map(toDeanStudentSummary),
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
        subtitle="Faculty-wide read-only directory across constituent departments."
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
