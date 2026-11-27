import {
  getSupabaseClient,
  resolveSaaisEnvConfig,
} from "@/lib/supabase/client";
import type { AdviserAssignmentRecord } from "@/components/features/assignment-history-dialog";
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import { fetchAllPages } from "../fetch-all-pages";

export interface StudentProfileData {
  readonly profile: ApiSchema<"Profile">;
  readonly programName: string | null;
  readonly departmentName: string | null;
  readonly collegeName: string | null;
  readonly adviserAssignments: readonly AdviserAssignmentRecord[];
  readonly curriculumAssignments: readonly ApiSchema<"StudentCurriculumAssignment">[];
  readonly curriculumTransfers: readonly ApiSchema<"CurriculumTransferRequest">[];
  readonly curriculumLabels: Readonly<Record<string, string>>;
}

/**
 * Fetches the student's profile, organization/program hierarchy,
 * adviser assignments, and curriculum assignment/transfer history.
 */
export async function fetchStudentProfileData(
  studentId: string,
): Promise<StudentProfileData> {
  const [
    profiles,
    orgs,
    programs,
    departments,
    faculties,
    adviserAssignments,
    curriculumAssignments,
    currVersions,
    curriculumTransfers,
  ] = await Promise.all([
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
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/program", {
          params: { query: { order: "id.asc", limit, offset } },
        }),
      (row) => row.id,
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/department", {
          params: { query: { order: "id.asc", limit, offset } },
        }),
      (row) => row.id,
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/faculty", {
          params: { query: { order: "id.asc", limit, offset } },
        }),
      (row) => row.id,
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/adviser_assignment", {
          params: {
            query: {
              student_id: postgrestFilter.eq(studentId),
              select:
                "id,adviser_id,adviser_name,adviser_email,adviser_faculty_name,adviser_consultation_hours,student_id,start_date,end_date,handed_over_to_adviser_id,handed_over_to_name,handover_label,created_at",
              order: "start_date.desc,id.desc",
              limit,
              offset,
            },
          },
        }),
      (row) => row.id,
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/student_curriculum_assignment", {
          params: {
            query: {
              student_id: postgrestFilter.eq(studentId),
              select:
                "id,student_id,curriculum_version_id,start_date,end_date,change_note,created_at",
              order: "start_date.desc,id.desc",
              limit,
              offset,
            },
          },
        }),
      (row) => row.id,
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/curriculum_version", {
          params: { query: { order: "id.asc", limit, offset } },
        }),
      (row) => row.id,
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/curriculum_transfer_request", {
          params: {
            query: {
              student_id: postgrestFilter.eq(studentId),
              order: "created_at.desc,id.desc",
              limit,
              offset,
            },
          },
        }),
      (row) => row.id,
    ),
  ]);

  const profile = profiles[0];
  if (!profile) {
    throw new Error("Student profile not found.");
  }

  const org = orgs[0] ?? null;

  const program = programs.find((p) => p.id === org?.program_id) ?? null;
  const department =
    departments.find(
      (d) => d.id === (org?.department_id ?? profile.department_id),
    ) ?? null;
  const faculty =
    faculties.find((f) => f.id === (org?.faculty_id ?? profile.faculty_id)) ??
    null;

  const curriculumLabels: Record<string, string> = {};
  for (const version of currVersions) {
    curriculumLabels[version.id] = version.version_label;
  }

  return {
    profile,
    programName: program?.name ?? null,
    departmentName: department?.name ?? null,
    collegeName: faculty?.name ?? null,
    adviserAssignments,
    curriculumAssignments,
    curriculumTransfers,
    curriculumLabels,
  };
}

const STUDENT_PHOTO_BUCKET = "student-photos";

/**
 * Uploads the photo to the private `student-photos` bucket and resolves the
 * object key plus a URL for `avatar_url`. In mock mode there is no storage
 * backend, so a local object URL stands in for the stored image.
 */
export async function uploadStudentPhotoObject(
  studentId: string,
  file: File,
  mimeType: "image/jpeg" | "image/png",
): Promise<{ storagePath: string; avatarUrl: string }> {
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const storagePath = `students/${studentId}/upload-${crypto.randomUUID()}.${ext}`;

  if (resolveSaaisEnvConfig().mode === "mock") {
    return { storagePath, avatarUrl: URL.createObjectURL(file) };
  }

  const bucket = getSupabaseClient().storage.from(STUDENT_PHOTO_BUCKET);
  const upload = await bucket.upload(storagePath, file, {
    upsert: false,
    contentType: mimeType,
  });
  if (upload.error) throw new Error("Could not upload the photo.");
  return { storagePath, avatarUrl: `/student-photos/${storagePath}` };
}

export async function removeStudentPhotoStagingObject(storagePath: string) {
  if (resolveSaaisEnvConfig().mode === "mock") return;
  await getSupabaseClient()
    .storage.from(STUDENT_PHOTO_BUCKET)
    .remove([storagePath]);
}

/**
 * Updates the student's profile photo metadata and URL.
 */
export async function updateStudentPhoto(
  studentId: string,
  body: ApiSchema<"StudentPhotoUpdateRequest">,
): Promise<ApiSchema<"Profile">> {
  const res = await apiClient.PUT("/functions/v1/students/{student_id}/photo", {
    params: { path: { student_id: studentId } },
    body,
  });
  return unwrapApiResult(res);
}

/**
 * Removes the student's profile photo.
 */
export async function deleteStudentPhoto(
  studentId: string,
): Promise<ApiSchema<"Profile">> {
  const res = await apiClient.DELETE(
    "/functions/v1/students/{student_id}/photo",
    {
      params: { path: { student_id: studentId } },
    },
  );
  return unwrapApiResult(res);
}
