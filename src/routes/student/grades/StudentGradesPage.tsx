import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertIcon } from "@/components/icons"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import {
  ReportPdfPreviewDialog,
  type ReportAuditEventType,
} from "@/components/features/report-pdf-preview-dialog"
import { SampleFooter } from "@/components/features/sample-footer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { apiClient, postgrestFilter, type ApiSchema } from "@/lib/api"
import {
  formatGradeSummaryReport,
  type PdfReportPayload,
} from "@/lib/pdf/student-report-formatter"
import {
  useCreateGradeFlag,
  useRecordGradesExport,
  useStudentGradeFlags,
  useStudentGrades,
} from "./use-student-grades"
import {
  FlagGradeDialog,
  type FlagGradeTarget,
} from "./FlagGradeDialog"
import {
  GradeFlagsListDialog,
  type GradeFlagAttemptMeta,
  type GradeFlagDisplayItem,
} from "./GradeFlagsListDialog"
import {
  TermGradesPanel,
  type TermGradesSection,
} from "./TermGradesPanel"

export interface StudentGradesViewProps {
  readonly terms: readonly TermGradesSection[]
  readonly flags?: readonly GradeFlagDisplayItem[]
  readonly courseDetails?: Readonly<
    Record<
      string,
      {
        readonly code: string
        readonly title?: string | null
      }
    >
  >
  readonly studentName?: string | null
  readonly studentNumber?: string | null
  readonly programLabel?: string | null
  readonly curriculumLabel?: string | null
  readonly adviserName?: string | null
  readonly department?: Partial<ApiSchema<"Department">> | null
  readonly faculty?: Partial<ApiSchema<"Faculty">> | null
  readonly onCreateFlag?: (
    payload: ApiSchema<"GradeFlagCreateRequest">
  ) => Promise<void> | void
  readonly isSubmittingFlag?: boolean
  readonly flagSubmitError?: string | null
  readonly onPrintReport?: (eventType: ReportAuditEventType) => void
}

/**
 * Pure Student Grades view accepting typed `ApiSchema` payloads.
 */
export function StudentGradesView({
  terms,
  flags = [],
  courseDetails,
  studentName,
  studentNumber,
  programLabel,
  curriculumLabel,
  adviserName,
  department,
  faculty,
  onCreateFlag,
  isSubmittingFlag = false,
  flagSubmitError = null,
  onPrintReport,
}: StudentGradesViewProps) {
  const [collapsedIds, setCollapsedIds] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [flagTarget, setFlagTarget] = React.useState<FlagGradeTarget | null>(
    null
  )
  const [flagsListOpen, setFlagsListOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const sortedTerms = React.useMemo(() => {
    return [...terms].sort(
      (a, b) => b.chronological_key - a.chronological_key
    )
  }, [terms])

  const openFlagAttemptIds = React.useMemo(() => {
    const ids = new Set<string>()
    for (const flag of flags) {
      if (flag.status === "open") {
        ids.add(flag.attempt_id)
      }
    }
    return ids
  }, [flags])

  const attemptMeta = React.useMemo(() => {
    const map: Record<string, GradeFlagAttemptMeta> = {}
    for (const term of sortedTerms) {
      const termLabel = `${term.school_year} · ${term.term_type}`
      for (const attempt of term.attempts) {
        const lookup = courseDetails?.[attempt.course_offering_id]
        map[attempt.id] = {
          code:
            attempt.code?.trim() ||
            lookup?.code?.trim() ||
            attempt.course_offering_id,
          title: attempt.title?.trim() || lookup?.title?.trim() || null,
          termLabel,
        }
      }
    }
    return map
  }, [sortedTerms, courseDetails])

  const allCollapsed =
    sortedTerms.length > 0 &&
    sortedTerms.every((term) => collapsedIds.has(term.school_term_id))

  function handleToggleAll() {
    if (allCollapsed) {
      setCollapsedIds(new Set())
    } else {
      setCollapsedIds(new Set(sortedTerms.map((term) => term.school_term_id)))
    }
  }

  function handleToggleTerm(termId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(termId)) {
        next.delete(termId)
      } else {
        next.add(termId)
      }
      return next
    })
  }

  const reportPayload = React.useMemo<PdfReportPayload>(() => {
    return formatGradeSummaryReport({
      studentName,
      studentNumber,
      programLabel,
      curriculumLabel,
      adviserName,
      department,
      faculty,
      terms: sortedTerms.map((term) => ({
        school_year: term.school_year,
        term_type: term.term_type,
        gwa: term.gwa,
        attempts: term.attempts.map((attempt) => {
          const lookup = courseDetails?.[attempt.course_offering_id]
          return {
            ...attempt,
            code: attempt.code ?? lookup?.code ?? null,
            title: attempt.title ?? lookup?.title ?? null,
          }
        }),
      })),
    })
  }, [
    studentName,
    studentNumber,
    programLabel,
    curriculumLabel,
    adviserName,
    department,
    faculty,
    sortedTerms,
    courseDetails,
  ])

  async function handleFlagSubmit(
    payload: ApiSchema<"GradeFlagCreateRequest">
  ) {
    await onCreateFlag?.(payload)
    setFlagTarget(null)
  }

  return (
    <div>
      <PageHeading
        title="Grades"
        subtitle="Every term, newest first. Flag any grade that needs review."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={sortedTerms.length === 0}
              className="min-h-11 md:min-h-[38px]"
            >
              Download Grade Summary
            </Button>
            <Button
              type="button"
              onClick={() => setFlagsListOpen(true)}
              className="min-h-11 md:min-h-[38px]"
            >
              View Grade Flags
            </Button>
          </>
        }
      />

      {sortedTerms.length > 0 && (
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleToggleAll}
            className="min-h-11 md:min-h-[38px]"
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        </div>
      )}

      {sortedTerms.length > 0 ? (
        <div className="grid gap-1">
          {sortedTerms.map((term) => (
            <TermGradesPanel
              key={term.school_term_id}
              term={term}
              courseDetails={courseDetails}
              openFlagAttemptIds={openFlagAttemptIds}
              open={!collapsedIds.has(term.school_term_id)}
              onOpenChange={() => handleToggleTerm(term.school_term_id)}
              onFlagClick={(attempt, meta) => {
                if (openFlagAttemptIds.has(attempt.id)) {
                  setFlagsListOpen(true)
                  return
                }
                setFlagTarget({
                  attemptId: attempt.id,
                  code: meta.code,
                  title: meta.title,
                  recordedGrade: meta.recordedGrade,
                })
              }}
            />
          ))}
        </div>
      ) : (
        <Panel title="No grade records">
          <p className="py-6 text-center text-body text-muted-foreground">
            No academic term grades recorded yet.
          </p>
        </Panel>
      )}

      <Alert variant="advisory" className="mt-5">
        <AlertIcon />
        <AlertDescription>
          Once passed, the most recent passing attempt counts for non-repeatable
          and grade-replacement courses. Additional-credit passes count
          independently. Lapsed INC remains INC and counts as{" "}
          <span className="font-mono">5.00</span> for GWA and failed units.
        </AlertDescription>
      </Alert>

      <SampleFooter>
        Sample records for presentation · Reference date: 19 September 2026
      </SampleFooter>

      <FlagGradeDialog
        open={flagTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setFlagTarget(null)
        }}
        target={flagTarget}
        onSubmit={handleFlagSubmit}
        isSubmitting={isSubmittingFlag}
        submitError={flagSubmitError}
      />

      <GradeFlagsListDialog
        open={flagsListOpen}
        onOpenChange={setFlagsListOpen}
        flags={flags}
        attemptMeta={attemptMeta}
      />

      <ReportPdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        report={reportPayload}
        filename="SAAIS-grade-summary.pdf"
        onPrint={onPrintReport}
      />
    </div>
  )
}

interface GradesPageData {
  readonly terms: readonly TermGradesSection[]
  readonly flags: readonly GradeFlagDisplayItem[]
  readonly courseDetails: Readonly<
    Record<string, { readonly code: string; readonly title?: string | null }>
  >
  readonly studentName: string | null
  readonly studentNumber: string | null
  readonly programLabel: string | null
  readonly curriculumLabel: string | null
  readonly adviserName: string | null
  readonly department: Partial<ApiSchema<"Department">> | null
  readonly faculty: Partial<ApiSchema<"Faculty">> | null
}

interface GradesMetadata {
  readonly schoolTerms: readonly ApiSchema<"SchoolTerm">[]
  readonly offerings: readonly ApiSchema<"CourseOffering">[]
  readonly courses: readonly ApiSchema<"Course">[]
  readonly profile: ApiSchema<"Profile"> | null
  readonly org: ApiSchema<"StudentOrganization"> | null
  readonly programs: readonly ApiSchema<"Program">[]
  readonly curricula: readonly ApiSchema<"CurriculumVersion">[]
  readonly assignments: readonly Pick<
    ApiSchema<"AdviserAssignment">,
    "id" | "adviser_id" | "adviser_name" | "start_date" | "end_date"
  >[]
  readonly departments: readonly ApiSchema<"Department">[]
  readonly faculties: readonly ApiSchema<"Faculty">[]
}

async function fetchStudentGradesMetadata(
  studentId: string
): Promise<GradesMetadata> {
  const [
    schoolTermsRes,
    offeringsRes,
    coursesRes,
    profilesRes,
    orgsRes,
    programsRes,
    curriculaRes,
    assignmentsRes,
    departmentsRes,
    facultiesRes,
  ] = await Promise.all([
    apiClient.GET("/rest/v1/school_term"),
    apiClient.GET("/rest/v1/course_offering"),
    apiClient.GET("/rest/v1/course"),
    apiClient.GET("/rest/v1/profile", {
      params: { query: { id: postgrestFilter.eq(studentId) } },
    }),
    apiClient.GET("/rest/v1/student_organization", {
      params: { query: { student_id: postgrestFilter.eq(studentId) } },
    }),
    apiClient.GET("/rest/v1/program"),
    apiClient.GET("/rest/v1/curriculum_version"),
    apiClient.GET("/rest/v1/adviser_assignment", {
      params: {
        query: {
          student_id: postgrestFilter.eq(studentId),
          select: "id,adviser_id,adviser_name,start_date,end_date",
          order: "start_date.desc",
        },
      },
    }),
    apiClient.GET("/rest/v1/department"),
    apiClient.GET("/rest/v1/faculty"),
  ])

  return {
    schoolTerms: schoolTermsRes.data ?? [],
    offerings: offeringsRes.data ?? [],
    courses: coursesRes.data ?? [],
    profile: profilesRes.data?.[0] ?? null,
    org: orgsRes.data?.[0] ?? null,
    programs: programsRes.data ?? [],
    curricula: curriculaRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
    departments: departmentsRes.data ?? [],
    faculties: facultiesRes.data ?? [],
  }
}

function buildGradesPageData(
  rawTerms: readonly ApiSchema<"TermGrades">[],
  flags: readonly ApiSchema<"GradeFlag">[],
  metadata: GradesMetadata | null
): GradesPageData {
  const schoolTerms = metadata?.schoolTerms ?? []
  const offerings = metadata?.offerings ?? []
  const courses = metadata?.courses ?? []
  const profile = metadata?.profile ?? null
  const org = metadata?.org ?? null
  const programs = metadata?.programs ?? []
  const curricula = metadata?.curricula ?? []
  const assignments = metadata?.assignments ?? []
  const departments = metadata?.departments ?? []
  const faculties = metadata?.faculties ?? []

  const termLockMap = new Map(schoolTerms.map((t) => [t.id, t.is_locked]))
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  const courseDetails: Record<
    string,
    { readonly code: string; readonly title?: string | null }
  > = {}
  for (const offering of offerings) {
    const course = courseMap.get(offering.course_id)
    if (course) {
      courseDetails[offering.id] = {
        code: course.code,
        title: course.title,
      }
    }
  }

  const terms: TermGradesSection[] = rawTerms.map((term) => ({
    ...term,
    is_locked: termLockMap.get(term.school_term_id) ?? false,
    attempts: term.attempts.map((attempt) => {
      const course = courseDetails[attempt.course_offering_id]
      return {
        ...attempt,
        code: course?.code ?? null,
        title: course?.title ?? null,
      }
    }),
  }))

  const program = programs.find((p) => p.id === org?.program_id) ?? null
  const curriculum =
    curricula.find((c) => c.id === org?.curriculum_version_id) ?? null
  const department =
    departments.find((d) => d.id === org?.department_id) ?? null
  const faculty = faculties.find((f) => f.id === org?.faculty_id) ?? null
  const activeAssignment =
    assignments.find((a) => a.end_date == null) ?? assignments[0] ?? null

  return {
    terms,
    flags,
    courseDetails,
    studentName: profile?.full_name ?? null,
    studentNumber: profile?.student_number ?? null,
    programLabel: program?.name ?? null,
    curriculumLabel: curriculum?.version_label ?? null,
    adviserName: activeAssignment?.adviser_name ?? null,
    department,
    faculty,
  }
}

/**
 * Student Grades page container handling loading, error/retry, grade flag submission,
 * and grade summary PDF preview.
 */
export function StudentGradesPage({ studentId }: { studentId: string }) {
  const gradesQuery = useStudentGrades(studentId)
  const flagsQuery = useStudentGradeFlags(studentId)
  const metaQuery = useQuery({
    queryKey: ["student", studentId, "grades-meta"],
    queryFn: () => fetchStudentGradesMetadata(studentId),
    enabled: Boolean(studentId),
  })
  const createFlagMutation = useCreateGradeFlag(studentId)
  const recordExportMutation = useRecordGradesExport(studentId)

  const data = React.useMemo(() => {
    if (!gradesQuery.data) return null
    return buildGradesPageData(
      gradesQuery.data,
      flagsQuery.data ?? [],
      metaQuery.data ?? null
    )
  }, [gradesQuery.data, flagsQuery.data, metaQuery.data])

  const isPending =
    gradesQuery.isPending || flagsQuery.isPending || metaQuery.isPending
  const isError = gradesQuery.isError || flagsQuery.isError

  const refetch = React.useCallback(async () => {
    await Promise.all([
      gradesQuery.refetch(),
      flagsQuery.refetch(),
      metaQuery.refetch(),
    ])
  }, [gradesQuery, flagsQuery, metaQuery])

  async function handleCreateFlag(
    payload: ApiSchema<"GradeFlagCreateRequest">
  ) {
    await createFlagMutation.mutateAsync(payload)
  }

  const flagSubmitError = createFlagMutation.error
    ? createFlagMutation.error instanceof Error
      ? createFlagMutation.error.message
      : "Could not submit your grade flag. Please try again."
    : null

  if (isPending) {
    return <p role="status">Loading...</p>
  }

  if (isError || !data) {
    return (
      <Panel
        title="Unable to load grades"
        description="We could not load your grade records right now."
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
    <StudentGradesView
      terms={data.terms}
      flags={data.flags}
      courseDetails={data.courseDetails}
      studentName={data.studentName}
      studentNumber={data.studentNumber}
      programLabel={data.programLabel}
      curriculumLabel={data.curriculumLabel}
      adviserName={data.adviserName}
      department={data.department}
      faculty={data.faculty}
      onCreateFlag={handleCreateFlag}
      isSubmittingFlag={createFlagMutation.isPending}
      flagSubmitError={flagSubmitError}
      onPrintReport={() => {
        recordExportMutation.mutate(undefined)
      }}
    />
  )
}

export default StudentGradesPage
