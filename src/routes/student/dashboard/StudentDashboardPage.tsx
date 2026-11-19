import * as React from "react"
import { Link } from "react-router"
import { AdviserCard } from "@/components/features/adviser-card"
import {
  AssignmentHistoryDialog,
  type AdviserAssignmentRecord,
} from "@/components/features/assignment-history-dialog"
import { DegreeProgress } from "@/components/features/degree-progress"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { QuickAccess } from "@/components/features/quick-access"
import { SampleFooter } from "@/components/features/sample-footer"
import { StatTile } from "@/components/features/stat-tile"
import { Button } from "@/components/ui/button"
import {
  apiClient,
  postgrestFilter,
  type ApiSchema,
} from "@/lib/api"
import { AdvisingNotesDialog } from "./AdvisingNotesDialog"
import {
  CourseRecommendationsPanel,
  type CourseRecommendationRow,
} from "./CourseRecommendationsPanel"
import { IncRadarPanel, type IncRadarDeficiencyItem } from "./IncRadarPanel"
import {
  fetchStudentAcademicSummary,
  fetchStudentAdviserAssignments,
  fetchStudentAdvisingNotes,
  fetchStudentPlanItems,
} from "./student-dashboard.api"

export interface StudentDashboardViewProps {
  readonly summary: ApiSchema<"AcademicSummary">
  readonly studentName?: string | null
  readonly programName?: string | null
  readonly curriculumLabel?: string | null
  readonly delinquencyThresholdUnits?: number | null
  readonly adviserAssignments?: readonly AdviserAssignmentRecord[]
  readonly recommendations?: readonly CourseRecommendationRow[]
  readonly notes?: readonly ApiSchema<"AdvisingNote">[]
  readonly checklistHref?: string
  readonly gradesHref?: string
  readonly historyHref?: string
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function formatShortDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—"
  const trimmed = dateValue.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const monthIndex = Number(isoMatch[2]) - 1
    const day = Number(isoMatch[3])
    const monthLabel = SHORT_MONTHS[monthIndex]
    if (monthLabel && day >= 1 && day <= 31) {
      return `${day} ${monthLabel} ${year}`
    }
  }
  return trimmed
}

function getFirstName(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "Student"
  const parts = fullName.trim().split(/\s+/)
  return parts[0] || "Student"
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "AD"
  const cleaned = name
    .replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Engr\.)\s+/i, "")
    .trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "AD"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/**
 * Pure Student Dashboard view accepting typed `ApiSchema` payloads.
 */
export function StudentDashboardView({
  summary,
  studentName,
  programName = "BS Computer Science",
  curriculumLabel = "2023–2024",
  delinquencyThresholdUnits = 12,
  adviserAssignments = [],
  recommendations = [],
  notes = [],
  checklistHref = "/student/checklist",
  gradesHref = "/student/grades",
  historyHref = "/student/history",
}: StudentDashboardViewProps) {
  const [notesOpen, setNotesOpen] = React.useState(false)
  const [assignmentHistoryOpen, setAssignmentHistoryOpen] =
    React.useState(false)

  const firstName = getFirstName(studentName)
  const gwaDisplay =
    summary.gwa === null ? "Not available" : summary.gwa.toFixed(2)
  const countedUnits = summary.counted_units ?? summary.earned_units
  const standingDisplay = summary.is_delinquent ? "Flagged" : "Good"

  const deficiencies = React.useMemo(
    () => (summary.deficiencies ?? []) as readonly IncRadarDeficiencyItem[],
    [summary.deficiencies]
  )
  const openIncDeficiencies = React.useMemo(
    () => deficiencies.filter((d) => d.kind === "open_inc"),
    [deficiencies]
  )
  const openIncCount = summary.open_inc_count ?? openIncDeficiencies.length
  const openIncNote =
    openIncCount > 0 ? "Review completion deadlines" : "No incomplete grades"

  const currentAdviserAssignment = React.useMemo(() => {
    return (
      adviserAssignments.find(
        (a) =>
          (a.effective_to !== undefined ? a.effective_to : a.end_date) == null
      ) ??
      adviserAssignments[0] ??
      null
    )
  }, [adviserAssignments])

  const adviserName =
    currentAdviserAssignment?.adviser_name?.trim() || "Assigned Adviser"
  const adviserInitials = getInitials(adviserName)
  const adviserFaculty =
    currentAdviserAssignment?.adviser_faculty_name?.trim() ||
    "Faculty of Computing"
  const adviserEmail =
    currentAdviserAssignment?.adviser_email?.trim() || "—"
  const assignedSince = formatShortDate(
    currentAdviserAssignment?.effective_from ??
      currentAdviserAssignment?.start_date
  )

  return (
    <div>
      <PageHeading
        title={`A clearer path forward, ${firstName}.`}
        subtitle="Your progress, your next courses, and the support to keep moving."
        actions={
          <Button type="button" onClick={() => setNotesOpen(true)}>
            View Advising Notes
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Cumulative GWA"
          value={
            <span className="font-mono tabular-nums">{gwaDisplay}</span>
          }
          note={
            <span className="font-mono tabular-nums">
              {countedUnits} counted units
            </span>
          }
        />
        <StatTile
          label="Units earned"
          value={
            <span className="font-mono tabular-nums">
              {summary.earned_units}
            </span>
          }
          note={
            <span className="font-mono tabular-nums">
              of {summary.required_units} required units
            </span>
          }
        />
        <StatTile
          label="Academic standing"
          value={standingDisplay}
          note={`${delinquencyThresholdUnits} failed units per term triggers a flag`}
        />
        <StatTile
          label="Open INC"
          value={
            <span className="font-mono tabular-nums">{openIncCount}</span>
          }
          note={openIncNote}
        />
      </div>

      <QuickAccess
        links={[
          { label: "Open checklist", to: checklistHref },
          { label: "Review grades", to: gradesHref },
          { label: "Enrollment history", to: historyHref },
        ]}
      />

      <div className="grid items-start gap-grid lg:grid-cols-[minmax(0,1.75fr)_minmax(270px,1fr)]">
        <div className="grid min-w-0 gap-grid">
          <CourseRecommendationsPanel
            items={recommendations}
            adviserName={adviserName}
            checklistHref={checklistHref}
          />

          <DegreeProgress
            program={programName}
            curriculum={curriculumLabel}
            earned={summary.earned_units}
            required={summary.required_units}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to={checklistHref}>Open checklist</Link>
              </Button>
            }
          >
            View the checklist to see direct credit, elective mappings and
            equivalency decisions.
          </DegreeProgress>
        </div>

        <div className="grid min-w-0 gap-grid">
          <AdviserCard
            name={adviserName}
            initials={adviserInitials}
            faculty={adviserFaculty}
            email={adviserEmail}
            assignedSince={assignedSince}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignmentHistoryOpen(true)}
              >
                View assignment history
              </Button>
            }
          />

          <IncRadarPanel deficiencies={deficiencies} />
        </div>
      </div>

      <SampleFooter>
        Sample records for presentation · Reference date: 19 September 2026
      </SampleFooter>

      <AdvisingNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        notes={notes}
        defaultAuthorName={adviserName}
      />

      <AssignmentHistoryDialog
        open={assignmentHistoryOpen}
        onOpenChange={setAssignmentHistoryOpen}
        assignments={adviserAssignments}
      />
    </div>
  )
}

interface DashboardPageData {
  readonly summary: ApiSchema<"AcademicSummary">
  readonly studentName: string | null
  readonly programName: string
  readonly curriculumLabel: string
  readonly adviserAssignments: readonly AdviserAssignmentRecord[]
  readonly recommendations: readonly CourseRecommendationRow[]
  readonly notes: readonly ApiSchema<"AdvisingNote">[]
}

async function fetchStudentDashboardData(
  studentId: string
): Promise<DashboardPageData> {
  const summary = await fetchStudentAcademicSummary(studentId)

  const [
    profilesRes,
    orgsRes,
    adviserAssignments,
    notes,
    rawPlanItems,
    offeringsRes,
    coursesRes,
    programsRes,
    curriculaRes,
  ] = await Promise.all([
    apiClient.GET("/rest/v1/profile", {
      params: { query: { id: postgrestFilter.eq(studentId) } },
    }),
    apiClient.GET("/rest/v1/student_organization", {
      params: { query: { student_id: postgrestFilter.eq(studentId) } },
    }),
    fetchStudentAdviserAssignments(studentId).catch(() => []),
    fetchStudentAdvisingNotes(studentId).catch(() => []),
    fetchStudentPlanItems(studentId).catch(() => []),
    apiClient.GET("/rest/v1/course_offering"),
    apiClient.GET("/rest/v1/course"),
    apiClient.GET("/rest/v1/program"),
    apiClient.GET("/rest/v1/curriculum_version"),
  ])

  const profile = profilesRes.data?.[0] ?? null
  const org = orgsRes.data?.[0] ?? null
  const offerings = offeringsRes.data ?? []
  const courses = coursesRes.data ?? []
  const programs = programsRes.data ?? []
  const curricula = curriculaRes.data ?? []

  const program = programs.find((p) => p.id === org?.program_id)
  const curriculum = curricula.find((c) => c.id === org?.curriculum_version_id)

  const offeringMap = new Map(offerings.map((o) => [o.id, o]))
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  const recommendations: CourseRecommendationRow[] = rawPlanItems.map(
    (item) => {
      const offering = offeringMap.get(item.course_offering_id)
      const course = offering ? courseMap.get(offering.course_id) : undefined
      return {
        ...item,
        code: course?.code ?? null,
        title: course?.title ?? null,
        units: course?.units ?? null,
      }
    }
  )

  return {
    summary,
    studentName: profile?.full_name ?? null,
    programName: program?.name ?? "BS Computer Science",
    curriculumLabel: curriculum?.version_label ?? "2024–2025",
    adviserAssignments,
    recommendations,
    notes,
  }
}

/**
 * Student Dashboard page container handling loading, error/retry, and data hydration.
 */
export function StudentDashboardPage({
  studentId,
}: {
  studentId: string
}) {
  const [state, setState] = React.useState<{
    data: DashboardPageData | null
    isPending: boolean
    isError: boolean
  }>({
    data: null,
    isPending: true,
    isError: false,
  })

  const refetch = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isPending: true, isError: false }))
    try {
      const result = await fetchStudentDashboardData(studentId)
      setState({ data: result, isPending: false, isError: false })
    } catch {
      setState({ data: null, isPending: false, isError: true })
    }
  }, [studentId])

  React.useEffect(() => {
    let cancelled = false
    fetchStudentDashboardData(studentId)
      .then((result) => {
        if (!cancelled) {
          setState({ data: result, isPending: false, isError: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ data: null, isPending: false, isError: true })
        }
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  if (state.isPending) {
    return <p role="status">Loading...</p>
  }

  if (state.isError || !state.data) {
    return (
      <Panel
        title="Unable to load dashboard"
        description="We could not load your academic summary right now."
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetch()}
        >
          Try again
        </Button>
      </Panel>
    )
  }

  return (
    <StudentDashboardView
      summary={state.data.summary}
      studentName={state.data.studentName}
      programName={state.data.programName}
      curriculumLabel={state.data.curriculumLabel}
      adviserAssignments={state.data.adviserAssignments}
      recommendations={state.data.recommendations}
      notes={state.data.notes}
    />
  )
}

export default StudentDashboardPage
