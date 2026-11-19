import type { AdviserAssignmentRecord } from "@/components/features/assignment-history-dialog"
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api"

export interface StudentProfileData {
  readonly profile: ApiSchema<"Profile">
  readonly programName: string | null
  readonly departmentName: string | null
  readonly collegeName: string | null
  readonly adviserAssignments: readonly AdviserAssignmentRecord[]
  readonly curriculumAssignments: readonly ApiSchema<"StudentCurriculumAssignment">[]
  readonly curriculumTransfers: readonly ApiSchema<"CurriculumTransferRequest">[]
  readonly curriculumLabels: Readonly<Record<string, string>>
}

/**
 * Fetches the student's profile, organization/program hierarchy,
 * adviser assignments, and curriculum assignment/transfer history.
 */
export async function fetchStudentProfileData(
  studentId: string
): Promise<StudentProfileData> {
  const [
    profilesRes,
    orgsRes,
    programsRes,
    departmentsRes,
    facultiesRes,
    adviserAssignmentsRes,
    currAssignmentsRes,
    currVersionsRes,
    currTransfersRes,
  ] = await Promise.all([
    apiClient.GET("/rest/v1/profile", {
      params: { query: { id: postgrestFilter.eq(studentId) } },
    }),
    apiClient.GET("/rest/v1/student_organization", {
      params: { query: { student_id: postgrestFilter.eq(studentId) } },
    }),
    apiClient.GET("/rest/v1/program"),
    apiClient.GET("/rest/v1/department"),
    apiClient.GET("/rest/v1/faculty"),
    apiClient.GET("/rest/v1/adviser_assignment", {
      params: {
        query: {
          student_id: postgrestFilter.eq(studentId),
          select:
            "id,adviser_id,adviser_name,adviser_email,adviser_faculty_name,adviser_consultation_hours,student_id,start_date,end_date,handed_over_to_adviser_id,handed_over_to_name,handover_label,created_at",
          order: "start_date.desc",
        },
      },
    }),
    apiClient.GET("/rest/v1/student_curriculum_assignment", {
      params: {
        query: {
          student_id: postgrestFilter.eq(studentId),
          select:
            "id,student_id,curriculum_version_id,start_date,end_date,change_note,created_at",
          order: "start_date.desc",
        },
      },
    }),
    apiClient.GET("/rest/v1/curriculum_version"),
    apiClient.GET("/rest/v1/curriculum_transfer_request", {
      params: {
        query: {
          student_id: postgrestFilter.eq(studentId),
          order: "created_at.desc",
        },
      },
    }),
  ])

  const profiles = unwrapApiResult(profilesRes)
  const profile = profiles[0]
  if (!profile) {
    throw new Error("Student profile not found.")
  }

  const org = orgsRes.data?.[0] ?? null
  const programs = programsRes.data ?? []
  const departments = departmentsRes.data ?? []
  const faculties = facultiesRes.data ?? []
  const currVersions = currVersionsRes.data ?? []

  const program = programs.find((p) => p.id === org?.program_id) ?? null
  const department =
    departments.find(
      (d) => d.id === (org?.department_id ?? profile.department_id)
    ) ?? null
  const faculty =
    faculties.find((f) => f.id === (org?.faculty_id ?? profile.faculty_id)) ??
    null

  const curriculumLabels: Record<string, string> = {}
  for (const version of currVersions) {
    curriculumLabels[version.id] = version.version_label
  }

  return {
    profile,
    programName: program?.name ?? null,
    departmentName: department?.name ?? null,
    collegeName: faculty?.name ?? null,
    adviserAssignments: adviserAssignmentsRes.data ?? [],
    curriculumAssignments: currAssignmentsRes.data ?? [],
    curriculumTransfers: currTransfersRes.data ?? [],
    curriculumLabels,
  }
}

/**
 * Updates the student's profile photo metadata and URL.
 */
export async function updateStudentPhoto(
  studentId: string,
  body: ApiSchema<"StudentPhotoUpdateRequest">
): Promise<ApiSchema<"Profile">> {
  const res = await apiClient.PUT("/functions/v1/students/{student_id}/photo", {
    params: { path: { student_id: studentId } },
    body,
  })
  return unwrapApiResult(res)
}

/**
 * Removes the student's profile photo.
 */
export async function deleteStudentPhoto(
  studentId: string
): Promise<ApiSchema<"Profile">> {
  const res = await apiClient.DELETE(
    "/functions/v1/students/{student_id}/photo",
    {
      params: { path: { student_id: studentId } },
    }
  )
  return unwrapApiResult(res)
}
