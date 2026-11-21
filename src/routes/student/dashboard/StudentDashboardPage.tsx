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
import { StatGrid } from "@/components/features/stat-tile"
import { Button } from "@/components/ui/button"
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
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
  if (!name || !name.trim()) return "—"
  const cleaned = name
    .replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Engr\.)\s+/i, "")
    .trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "—"
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
  delinquencyThresholdUnits = null,
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
    currentAdviserAssignment?.adviser_name?.trim() || "No adviser assigned"
  const adviserInitials = getInitials(currentAdviserAssignment?.adviser_name)
  const adviserFaculty =
    currentAdviserAssignment?.adviser_faculty_name?.trim() || "—"
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

      <StatGrid
        items={[
          {
            label: "Cumulative GWA",
            value: gwaDisplay,
            note: `${countedUnits} counted units`,
          },
          {
            label: "Units earned",
            value: summary.earned_units,
            note: `of ${summary.required_units} required units`,
          },
          {
            label: "Academic standing",
            value: standingDisplay,
            note:
              delinquencyThresholdUnits != null
                ? `${delinquencyThresholdUnits} failed units per term triggers a flag`
                : "Academic standing based on term failed units",
          },
          {
            label: "Open INC",
            value: openIncCount,
            note: openIncNote,
          },
        ]}
      />

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

      <AdvisingNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        notes={notes}
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
  readonly delinquencyThresholdUnits: number | null
  readonly offeringMap: ReadonlyMap<string, ApiSchema<"CourseOffering">>
  readonly courseMap: ReadonlyMap<string, ApiSchema<"Course">>
}

async function fetchDashboardMeta(
  studentId: string
): Promise<DashboardMetaData> {
  const [profiles, orgs, offerings, courses, programs, curricula] =
    await Promise.all([
      apiClient
        .GET("/rest/v1/profile", {
          params: { query: { id: postgrestFilter.eq(studentId) } },
        })
        .then(unwrapApiResult),
      apiClient
        .GET("/rest/v1/student_organization", {
          params: { query: { student_id: postgrestFilter.eq(studentId) } },
        })
        .then(unwrapApiResult),
      apiClient.GET("/rest/v1/course_offering").then(unwrapApiResult),
      apiClient.GET("/rest/v1/course").then(unwrapApiResult),
      apiClient.GET("/rest/v1/program").then(unwrapApiResult),
      apiClient.GET("/rest/v1/curriculum_version").then(unwrapApiResult),
    ])

  const profile = profiles[0] ?? null
  const org = orgs[0] ?? null

  const program = programs.find((p) => p.id === org?.program_id)
  const curriculum = curricula.find((c) => c.id === org?.curriculum_version_id)

  return {
    studentName: profile?.full_name ?? null,
    programName: program?.name ?? "Unassigned program",
    curriculumLabel: curriculum?.version_label ?? "—",
    delinquencyThresholdUnits: curriculum?.delinquency_threshold ?? null,
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
      delinquencyThresholdUnits={
        metaQuery.data?.delinquencyThresholdUnits ?? null
      }
      adviserAssignments={dashboard.data.adviserAssignments}
      recommendations={recommendations}
      notes={dashboard.data.notes}
    />
  )
}

export default StudentDashboardPage
