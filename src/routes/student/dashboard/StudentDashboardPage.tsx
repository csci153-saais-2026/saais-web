import * as React from "react"
import { useQuery } from "@tanstack/react-query"
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
import { useStudentDashboard } from "./use-student-dashboard"

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
  programName = "Unassigned program",
  curriculumLabel = "—",
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
            program={programName ?? "Unassigned program"}
            curriculum={curriculumLabel ?? "—"}
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

interface DashboardMetaData {
  readonly studentName: string | null
  readonly programName: string
  readonly curriculumLabel: string
  readonly offeringMap: ReadonlyMap<string, ApiSchema<"CourseOffering">>
  readonly courseMap: ReadonlyMap<string, ApiSchema<"Course">>
}

async function fetchDashboardMeta(
  studentId: string
): Promise<DashboardMetaData> {
  const [
    profilesRes,
    orgsRes,
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

  return {
    studentName: profile?.full_name ?? null,
    programName: program?.name ?? "Unassigned program",
    curriculumLabel: curriculum?.version_label ?? "—",
    offeringMap: new Map(offerings.map((o) => [o.id, o])),
    courseMap: new Map(courses.map((c) => [c.id, c])),
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
  const dashboard = useStudentDashboard(studentId)
  const metaQuery = useQuery({
    queryKey: ["student", studentId, "dashboard-meta"],
    queryFn: () => fetchDashboardMeta(studentId),
    enabled: Boolean(studentId),
  })

  const recommendations = React.useMemo<CourseRecommendationRow[]>(() => {
    const planItems = dashboard.data?.planItems ?? []
    const offeringMap = metaQuery.data?.offeringMap
    const courseMap = metaQuery.data?.courseMap
    return planItems.map((item) => {
      const offering = offeringMap?.get(item.course_offering_id)
      const course = offering ? courseMap?.get(offering.course_id) : undefined
      return {
        ...item,
        code: course?.code ?? null,
        title: course?.title ?? null,
        units: course?.units ?? null,
      }
    })
  }, [dashboard.data?.planItems, metaQuery.data])

  if (dashboard.isPending || metaQuery.isPending) {
    return <p role="status">Loading...</p>
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <Panel
        title="Unable to load dashboard"
        description="We could not load your academic summary right now."
      >
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void Promise.all([dashboard.refetch(), metaQuery.refetch()])
          }
        >
          Try again
        </Button>
      </Panel>
    )
  }

  return (
    <StudentDashboardView
      summary={dashboard.data.summary}
      studentName={metaQuery.data?.studentName ?? null}
      programName={metaQuery.data?.programName ?? "Unassigned program"}
      curriculumLabel={metaQuery.data?.curriculumLabel ?? "—"}
      adviserAssignments={dashboard.data.adviserAssignments}
      recommendations={recommendations}
      notes={dashboard.data.notes}
    />
  )
}

export default StudentDashboardPage
