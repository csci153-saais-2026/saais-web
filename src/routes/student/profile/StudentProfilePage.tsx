import { AccountSkeleton } from "@/components/features/loading-skeletons";
import * as React from "react";
import {
  AssignmentHistoryDialog,
  type AdviserAssignmentRecord,
} from "@/components/features/assignment-history-dialog";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiSchema } from "@/lib/api";
import { CurriculumHistoryDialog } from "./CurriculumHistoryDialog";
import { ProfileDetailsPanel } from "./ProfileDetailsPanel";
import { ProfilePhotoCard } from "./ProfilePhotoCard";
import {
  removeStudentPhotoStagingObject,
  uploadStudentPhotoObject,
} from "./student-profile.api";
import {
  useDeleteStudentPhoto,
  useUpdateStudentPhoto,
} from "./use-student-photo";
import { useStudentProfile } from "./use-student-profile";
import {
  studentPhotoSchema,
  type StudentPhotoValues,
} from "./student-photo-schema";

export interface StudentProfileViewProps {
  readonly profile: ApiSchema<"Profile">;
  readonly programName?: string | null;
  readonly departmentName?: string | null;
  readonly collegeName?: string | null;
  readonly adviserAssignments?: readonly AdviserAssignmentRecord[];
  readonly curriculumAssignments?: readonly ApiSchema<"StudentCurriculumAssignment">[];
  readonly curriculumTransfers?: readonly ApiSchema<"CurriculumTransferRequest">[];
  readonly curriculumLabels?: Readonly<Record<string, string>>;
  readonly onUploadPhoto?: (file: File) => Promise<void> | void;
  readonly onRemovePhoto?: () => Promise<void> | void;
  readonly isPhotoBusy?: boolean;
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
] as const;

function formatShortDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—";
  const trimmed = dateValue.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const monthLabel = SHORT_MONTHS[monthIndex];
    if (monthLabel && day >= 1 && day <= 31) {
      return `${day} ${monthLabel} ${year}`;
    }
  }
  return trimmed;
}

function getInitials(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "ST";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Pure Student Profile view accepting typed `ApiSchema` payloads.
 */
export function StudentProfileView({
  profile,
  programName,
  departmentName,
  collegeName,
  adviserAssignments = [],
  curriculumAssignments = [],
  curriculumTransfers = [],
  curriculumLabels,
  onUploadPhoto,
  onRemovePhoto,
  isPhotoBusy = false,
}: StudentProfileViewProps) {
  const [assignmentDialogOpen, setAssignmentDialogOpen] = React.useState(false);
  const [curriculumDialogOpen, setCurriculumDialogOpen] = React.useState(false);

  const initials = getInitials(profile.full_name);

  const activeCurriculum = React.useMemo(() => {
    const current = curriculumAssignments.find((a) => a.end_date == null);
    if (!current) return null;
    return (
      curriculumLabels?.[current.curriculum_version_id]?.trim() ||
      current.curriculum_version_id
    );
  }, [curriculumAssignments, curriculumLabels]);

  return (
    <div>
      <PageHeading
        title="Your student profile."
        subtitle="Your identity and academic assignments are maintained by an administrator."
      />

      <div className="grid items-start gap-grid lg:grid-cols-[minmax(0,1.75fr)_minmax(270px,1fr)]">
        <div className="grid min-w-0 gap-grid">
          <ProfilePhotoCard
            initials={initials}
            avatarUrl={profile.avatar_url}
            fullName={profile.full_name}
            onUpload={onUploadPhoto}
            onRemove={onRemovePhoto}
            isBusy={isPhotoBusy}
          />

          <ProfileDetailsPanel
            profile={profile}
            programName={programName}
            departmentName={departmentName}
            collegeName={collegeName}
          />
        </div>

        <div className="grid min-w-0 gap-grid">
          <Panel
            title="Adviser assignment history"
            description="Continuous support, with every transition preserved."
            flush
          >
            {adviserAssignments.length > 0 ? (
              <Table responsive>
                <TableHeader className="bg-secondary">
                  <TableRow>
                    {["Adviser", "Start", "End"].map((header) => (
                      <TableHead
                        key={header}
                        scope="col"
                        className="px-3.5 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adviserAssignments.map((assignment) => {
                    const fromRaw =
                      assignment.effective_from ?? assignment.start_date;
                    const toRaw =
                      assignment.effective_to !== undefined
                        ? assignment.effective_to
                        : assignment.end_date;
                    const isActive = toRaw == null;

                    return (
                      <TableRow
                        key={assignment.id}
                        className="border-line-soft"
                      >
                        <TableCell
                          label="Adviser"
                          className="px-3.5 py-row text-cell font-medium text-foreground"
                        >
                          <span
                            className="block max-w-56 truncate"
                            title={assignment.adviser_name?.trim() || undefined}
                          >
                            {assignment.adviser_name?.trim() ||
                              assignment.adviser_id}
                          </span>
                        </TableCell>
                        <TableCell
                          label="Start"
                          className="px-3.5 py-row text-cell tabular-nums text-foreground"
                        >
                          {formatShortDate(fromRaw)}
                        </TableCell>
                        <TableCell
                          label="End"
                          className="px-3.5 py-row text-cell tabular-nums text-foreground"
                        >
                          {isActive ? "Current" : formatShortDate(toRaw)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="px-5 py-6 text-center text-cell text-muted-foreground">
                No adviser assignments recorded yet.
              </p>
            )}

            <div className="border-t border-line-soft px-5 py-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignmentDialogOpen(true)}
                className="min-h-11 md:min-h-[38px]"
              >
                View assignment history
              </Button>
            </div>
          </Panel>

          <Panel
            title="Curriculum assignment"
            description="One active curriculum at a time."
          >
            {activeCurriculum && (
              <p className="mb-3 text-cell font-medium text-foreground">
                Active curriculum:{" "}
                <span className="font-mono tabular-nums">
                  {activeCurriculum}
                </span>
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurriculumDialogOpen(true)}
              className="min-h-11 md:min-h-[38px]"
            >
              View curriculum history
            </Button>
          </Panel>
        </div>
      </div>

      <AssignmentHistoryDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        assignments={adviserAssignments}
      />

      <CurriculumHistoryDialog
        open={curriculumDialogOpen}
        onOpenChange={setCurriculumDialogOpen}
        assignments={curriculumAssignments}
        transfers={curriculumTransfers}
        curriculumLabels={curriculumLabels}
      />
    </div>
  );
}

/**
 * Student Profile page container handling loading, error/retry, and profile photo updates.
 */
export function StudentProfilePage({ studentId }: { studentId: string }) {
  const { data, isPending, isError, refetch } = useStudentProfile(studentId);
  const updatePhotoMutation = useUpdateStudentPhoto(studentId);
  const deletePhotoMutation = useDeleteStudentPhoto(studentId);

  const isPhotoBusy =
    updatePhotoMutation.isPending || deletePhotoMutation.isPending;

  const photoLockRef = React.useRef(false);

  async function handleUploadPhoto(file: File) {
    if (photoLockRef.current) return;
    photoLockRef.current = true;
    try {
      const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const { storagePath, avatarUrl } = await uploadStudentPhotoObject(
        studentId,
        file,
        mimeType,
      );
      const payload: StudentPhotoValues = studentPhotoSchema.parse({
        storage_object_path: storagePath,
        avatar_url: avatarUrl,
        mime_type: mimeType,
        file_size_bytes: file.size,
      });
      await updatePhotoMutation.mutateAsync(payload);
      void removeStudentPhotoStagingObject(storagePath).catch(() => {});
    } finally {
      photoLockRef.current = false;
    }
  }

  async function handleRemovePhoto() {
    if (photoLockRef.current) return;
    photoLockRef.current = true;
    try {
      await deletePhotoMutation.mutateAsync();
    } finally {
      photoLockRef.current = false;
    }
  }

  if (!isPending && (isError || !data)) {
    return (
      <Panel
        title="Unable to load profile"
        description="We could not load your student profile right now."
      >
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <AccountSkeleton
      id="student-profile"
      data={isPending ? null : data}
      label="Loading..."
    >
      {(data) => (
        <StudentProfileView
          profile={data.profile}
          programName={data.programName}
          departmentName={data.departmentName}
          collegeName={data.collegeName}
          adviserAssignments={data.adviserAssignments}
          curriculumAssignments={data.curriculumAssignments}
          curriculumTransfers={data.curriculumTransfers}
          curriculumLabels={data.curriculumLabels}
          onUploadPhoto={handleUploadPhoto}
          onRemovePhoto={handleRemovePhoto}
          isPhotoBusy={isPhotoBusy}
        />
      )}
    </AccountSkeleton>
  );
}

export default StudentProfilePage;
