import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { STUDENT_HEADER_SKELETON_SAMPLE } from "../adviser.skeleton-samples";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { StudentRecordHeader } from "@/components/features/student-record-header";
import { Button } from "@/components/ui/button";
import { getSelectedStudent } from "./advisees.api";
import { useScopedRequest } from "./use-scoped-request";
import { useStudentPhotoUrl } from "@/hooks/use-student-photo-url";

export function SelectedStudentHeader({ id }: { id: string }) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([user?.id, id, revision]);
  const { data, error } = useScopedRequest(key, !!user?.id, () =>
    getSelectedStudent(id),
  );
  const photoUrl = useStudentPhotoUrl(data?.avatar_url, user?.id);
  if (error)
    return (
      <div role="alert" className="mb-5">
        <p>{error}</p>
        <Button variant="outline" onClick={() => setRevision((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  // While loading, the skeleton is measured from a sample record.
  const record = data ?? STUDENT_HEADER_SKELETON_SAMPLE;
  const header = (
    <StudentRecordHeader
      name={record.full_name}
      avatarUrl={photoUrl}
      initials={record.full_name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()}
      studentNumber={record.student_number}
      program={record.program_name}
      yearLabel={`Year ${record.year_level}`}
      email={record.email}
      standing={
        record.is_delinquent ||
        record.standing === "probation" ||
        record.standing === "dismissed"
          ? "delinquent"
          : record.open_flags_count > 0 || record.standing === "warning"
            ? "flagged"
            : "good"
      }
      standingLabel={
        record.is_delinquent ||
        record.standing === "probation" ||
        record.standing === "dismissed"
          ? "Delinquency flag"
          : record.open_flags_count > 0
            ? "Open grade flag"
            : record.standing.replaceAll("_", " ")
      }
    />
  );
  if (!data)
    return (
      <AccountSkeleton
        id="selected-student-header"
        loading
        measured
        label="Loading student record…"
      >
        {header}
      </AccountSkeleton>
    );
  return header;
}
