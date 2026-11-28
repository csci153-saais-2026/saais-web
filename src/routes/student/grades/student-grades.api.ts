import { fetchAllPages } from "../fetch-all-pages";
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import {
  fetchStudentCourses,
  fetchStudentOfferings,
  fetchStudentSchoolTerms,
} from "../student-catalog.api";

export interface GradeCatalogReferences {
  schoolTermIds: string[];
  offeringIds: string[];
}

export async function fetchStudentGradesMetadata(
  studentId: string,
  { schoolTermIds, offeringIds }: GradeCatalogReferences,
) {
  const [profiles, orgs, assignments, schoolTerms, offerings] =
    await Promise.all([
      apiClient
        .GET("/rest/v1/profile", {
          params: { query: { id: postgrestFilter.eq(studentId), limit: 1 } },
        })
        .then(unwrapApiResult),
      apiClient
        .GET("/rest/v1/student_organization", {
          params: {
            query: { student_id: postgrestFilter.eq(studentId), limit: 1 },
          },
        })
        .then(unwrapApiResult),
      fetchAllPages(
        (limit, offset) =>
          apiClient.GET("/rest/v1/adviser_assignment", {
            params: {
              query: {
                student_id: postgrestFilter.eq(studentId),
                select: "id,adviser_id,adviser_name,start_date,end_date",
                order: "start_date.desc,id.asc",
                limit,
                offset,
              },
            },
          }),
        (row) => row.id,
      ),
      fetchStudentSchoolTerms(schoolTermIds),
      fetchStudentOfferings(offeringIds),
    ]);
  const org = orgs[0] ?? null;
  const [courses, programs, curricula, departments, faculties] =
    await Promise.all([
      fetchStudentCourses(offerings.map((offering) => offering.course_id)),
      org?.program_id
        ? apiClient
            .GET("/rest/v1/program", {
              params: {
                query: { id: postgrestFilter.eq(org.program_id), limit: 1 },
              },
            })
            .then(unwrapApiResult)
        : [],
      org?.curriculum_version_id
        ? apiClient
            .GET("/rest/v1/curriculum_version", {
              params: {
                query: {
                  id: postgrestFilter.eq(org.curriculum_version_id),
                  limit: 1,
                },
              },
            })
            .then(unwrapApiResult)
        : [],
      org?.department_id
        ? apiClient
            .GET("/rest/v1/department", {
              params: {
                query: { id: postgrestFilter.eq(org.department_id), limit: 1 },
              },
            })
            .then(unwrapApiResult)
        : [],
      org?.faculty_id
        ? apiClient
            .GET("/rest/v1/faculty", {
              params: {
                query: { id: postgrestFilter.eq(org.faculty_id), limit: 1 },
              },
            })
            .then(unwrapApiResult)
        : [],
    ]);
  return {
    schoolTerms,
    offerings,
    courses,
    profile: profiles[0] ?? null,
    org,
    programs,
    curricula,
    assignments,
    departments,
    faculties,
  };
}

export async function fetchStudentGrades(
  studentId: string,
): Promise<ApiSchema<"TermGrades">[]> {
  return fetchAllPages(
    (limit, offset) =>
      apiClient.GET("/functions/v1/students/{student_id}/grades", {
        params: { path: { student_id: studentId }, query: { limit, offset } },
      }),
    (term) => term.school_term_id,
  );
}

export async function fetchStudentGradeFlags(
  studentId: string,
): Promise<ApiSchema<"GradeFlag">[]> {
  const res = await apiClient.GET("/rest/v1/grade_flag", {
    params: {
      query: {
        student_id: postgrestFilter.eq(studentId),
        order: "created_at.desc",
        limit: 1000,
      },
    },
  });
  return unwrapApiResult(res);
}

export async function createStudentGradeFlag(
  studentId: string,
  body: ApiSchema<"GradeFlagCreateRequest">,
): Promise<ApiSchema<"GradeFlag">> {
  const res = await apiClient.POST(
    "/functions/v1/students/{student_id}/grade-flags",
    {
      params: { path: { student_id: studentId } },
      body,
    },
  );
  return unwrapApiResult(res);
}

export async function recordGradesExportEvent(
  studentId: string,
  details = "Downloaded the grades report as PDF",
): Promise<void> {
  const res = await apiClient.POST("/functions/v1/audit/view-event", {
    body: {
      event_type: "pdf_exported",
      student_id: studentId,
      details,
    },
  });
  unwrapApiResult(res);
}
