import * as React from "react"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { SampleFooter } from "@/components/features/sample-footer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  EnrollmentHistoryTable,
  type EnrollmentHistoryRow,
} from "./EnrollmentHistoryTable"
import {
  fetchStudentEnrollmentHistory,
  type EnrollmentHistoryOfferingDetail,
  type StudentEnrollmentHistoryData,
} from "./student-enrollment-history.api"

export interface StudentEnrollmentHistoryViewProps {
  readonly attempts: readonly EnrollmentHistoryRow[]
  readonly offeringDetails?: Readonly<
    Record<string, EnrollmentHistoryOfferingDetail>
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

/**
 * Student Enrollment History page container handling loading, error/retry, and data hydration.
 */
export function StudentEnrollmentHistoryPage({
  studentId,
}: {
  studentId: string
}) {
  const [state, setState] = React.useState<{
    data: StudentEnrollmentHistoryData | null
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
      const result = await fetchStudentEnrollmentHistory(studentId)
      setState({ data: result, isPending: false, isError: false })
    } catch {
      setState({ data: null, isPending: false, isError: true })
    }
  }, [studentId])

  React.useEffect(() => {
    let cancelled = false
    fetchStudentEnrollmentHistory(studentId)
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
