import * as React from "react"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { SampleFooter } from "@/components/features/sample-footer"
import { Button } from "@/components/ui/button"
import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  EnrollmentHistoryTable,
  type EnrollmentHistoryRow,
} from "./EnrollmentHistoryTable"

export interface StudentEnrollmentHistoryViewProps {
  readonly attempts: readonly EnrollmentHistoryRow[]
  readonly offeringDetails?: Readonly<
    Record<
      string,
      {
        readonly code: string
        readonly title?: string | null
        readonly termLabel?: string | null
      }
    >
  >
  readonly slotLabels?: Readonly<Record<string, string>>
  readonly className?: string
}

/**
 * Pure Student Enrollment History view accepting typed `ApiSchema<'AttemptResult'>` rows.
 */
export function StudentEnrollmentHistoryView({
  attempts,
  offeringDetails,
  slotLabels,
  className,
}: StudentEnrollmentHistoryViewProps) {
  return (
    <div className={cn(className)}>
      <PageHeading
        title="Your enrollment history."
        subtitle="Every attempt stays on record, including retakes and withdrawals."
      />

      <EnrollmentHistoryTable
        attempts={attempts}
        offeringDetails={offeringDetails}
        slotLabels={slotLabels}
      />

      <SampleFooter>
        Sample records for presentation · Reference date: 19 September 2026
      </SampleFooter>
    </div>
  )
}

interface EnrollmentHistoryPageData {
  readonly attempts: readonly EnrollmentHistoryRow[]
  readonly offeringDetails: Readonly<
    Record<
      string,
      {
        readonly code: string
        readonly title?: string | null
        readonly termLabel?: string | null
      }
    >
  >
  readonly slotLabels: Readonly<Record<string, string>>
}

async function fetchEnrollmentHistoryData(
  studentId: string
): Promise<EnrollmentHistoryPageData> {
  const [attemptsRes, offeringsRes, coursesRes, termsRes, slotsRes] =
    await Promise.all([
      apiClient.GET("/rest/v1/attempt_result", {
        params: {
          query: {
            student_id: postgrestFilter.eq(studentId),
            order: "created_at.desc",
          },
        },
      }),
      apiClient.GET("/rest/v1/course_offering"),
      apiClient.GET("/rest/v1/course"),
      apiClient.GET("/rest/v1/school_term"),
      apiClient.GET("/rest/v1/curriculum_term_course"),
    ])

  const rawAttempts = unwrapApiResult(attemptsRes)
  const offerings = offeringsRes.data ?? []
  const courses = coursesRes.data ?? []
  const terms = termsRes.data ?? []
  const slots = slotsRes.data ?? []

  const courseMap = new Map(courses.map((c) => [c.id, c]))
  const termMap = new Map(terms.map((t) => [t.id, t]))
  const offeringMap = new Map(offerings.map((o) => [o.id, o]))

  const offeringDetails: Record<
    string,
    {
      readonly code: string
      readonly title?: string | null
      readonly termLabel?: string | null
    }
  > = {}

  for (const offering of offerings) {
    const course = courseMap.get(offering.course_id)
    const term = termMap.get(offering.school_term_id)
    if (course) {
      offeringDetails[offering.id] = {
        code: course.code,
        title: course.title,
        termLabel: term ? `${term.school_year} · ${term.term_type}` : null,
      }
    }
  }

  const slotLabels: Record<string, string> = {}
  for (const slot of slots) {
    const course = slot.course_id ? courseMap.get(slot.course_id) : undefined
    const label = course?.code ?? slot.slot_label ?? null
    if (label) {
      slotLabels[slot.id] = label
    }
  }

  const attempts: EnrollmentHistoryRow[] = [...rawAttempts].sort((a, b) => {
    const aOff = offeringMap.get(a.course_offering_id)
    const bOff = offeringMap.get(b.course_offering_id)
    const aKey = aOff ? (termMap.get(aOff.school_term_id)?.chronological_key ?? 0) : 0
    const bKey = bOff ? (termMap.get(bOff.school_term_id)?.chronological_key ?? 0) : 0
    if (bKey !== aKey) return bKey - aKey
    return (b.created_at ?? "").localeCompare(a.created_at ?? "")
  })

  return {
    attempts,
    offeringDetails,
    slotLabels,
  }
}

/**
 * Student Enrollment History page container handling loading, error/retry, and data hydration.
 */
export function StudentEnrollmentHistoryPage({
  studentId,
}: {
  studentId: string
}) {
  const [state, setState] = React.useState<{
    data: EnrollmentHistoryPageData | null
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
      const result = await fetchEnrollmentHistoryData(studentId)
      setState({ data: result, isPending: false, isError: false })
    } catch {
      setState({ data: null, isPending: false, isError: true })
    }
  }, [studentId])

  React.useEffect(() => {
    let cancelled = false
    fetchEnrollmentHistoryData(studentId)
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
        title="Unable to load enrollment history"
        description="We could not load your course enrollment history right now."
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
    <StudentEnrollmentHistoryView
      attempts={state.data.attempts}
      offeringDetails={state.data.offeringDetails}
      slotLabels={state.data.slotLabels}
    />
  )
}

export default StudentEnrollmentHistoryPage
