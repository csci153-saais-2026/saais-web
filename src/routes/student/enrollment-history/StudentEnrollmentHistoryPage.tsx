import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EnrollmentHistoryTable,
  type EnrollmentHistoryRow,
} from "./EnrollmentHistoryTable";
import type { EnrollmentHistoryOfferingDetail } from "./student-enrollment-history.api";
import { useStudentEnrollmentHistory } from "./use-student-enrollment-history";

export interface StudentEnrollmentHistoryViewProps {
  readonly attempts: readonly EnrollmentHistoryRow[];
  readonly offeringDetails?: Readonly<
    Record<string, EnrollmentHistoryOfferingDetail>
  >;
  readonly slotLabels?: Readonly<Record<string, string>>;
  readonly className?: string;
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
    </div>
  );
}

/**
 * Student Enrollment History page container handling loading, error/retry, and data hydration.
 */
export function StudentEnrollmentHistoryPage({
  studentId,
}: {
  studentId: string;
}) {
  const { data, isPending, isError, refetch } =
    useStudentEnrollmentHistory(studentId);

  if (!isPending && (isError || !data)) {
    return (
      <Panel
        title="Unable to load enrollment history"
        description="We could not load your course enrollment history right now."
      >
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <AccountSkeleton
      id="student-enrollment-history"
      data={isPending ? null : data}
      label="Loading..."
    >
      {(data) => (
        <StudentEnrollmentHistoryView
          attempts={data.attempts}
          offeringDetails={data.offeringDetails}
          slotLabels={data.slotLabels}
        />
      )}
    </AccountSkeleton>
  );
}

export default StudentEnrollmentHistoryPage;
