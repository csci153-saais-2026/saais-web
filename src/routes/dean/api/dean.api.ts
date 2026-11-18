import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"

export async function getFacultyReport(): Promise<ApiSchema<"FacultyReport">> {
  return unwrapApiResult(await apiClient.GET("/functions/v1/reports/faculty"))
}

export async function getDeanFaculties(): Promise<ApiSchema<"Faculty">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/faculty"))
}

export async function getFacultyDepartments(): Promise<ApiSchema<"Department">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/department"))
}

export async function getDeanStudents(): Promise<ApiSchema<"StudentRosterResponse">> {
  const items: ApiSchema<"StudentRosterItem">[] = []

  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(
      await apiClient.GET("/functions/v1/students", {
        params: { query: { limit: 100, offset } },
      }),
    )
    items.push(...page.items)
    if (items.length >= page.total_count || page.items.length === 0) {
      return { ...page, items }
    }
  }
}

export async function getDeanStudentChecklist(studentId: string): Promise<{
  results: ApiSchema<"ChecklistSlotResult">[]
  slots: ApiSchema<"CurriculumTermCourse">[]
  terms: ApiSchema<"CurriculumTerm">[]
  courses: ApiSchema<"Course">[]
}> {
  const results = unwrapApiResult(
    await apiClient.GET("/functions/v1/students/{student_id}/checklist", {
      params: { path: { student_id: studentId }, query: { limit: 100, offset: 0 } },
    }),
  )
  const [slots, terms, courses] = await Promise.all([
    unwrapApiResult(await apiClient.GET("/rest/v1/curriculum_term_course")),
    unwrapApiResult(await apiClient.GET("/rest/v1/curriculum_term")),
    unwrapApiResult(await apiClient.GET("/rest/v1/course")),
  ])
  return { results, slots, terms, courses }
}

export async function getDeanStudentGrades(
  studentId: string,
): Promise<ApiSchema<"TermGrades">[]> {
  return unwrapApiResult(
    await apiClient.GET("/functions/v1/students/{student_id}/grades", {
      params: { path: { student_id: studentId } },
    }),
  )
}

export async function getDeanCourses(): Promise<ApiSchema<"Course">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/course"))
}

export async function getDeanCourseOfferings(): Promise<ApiSchema<"CourseOffering">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/course_offering"))
}

export async function getDeanAttemptResults(): Promise<ApiSchema<"AttemptResult">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/attempt_result"))
}

export async function getDeanAuditLogEntries(): Promise<ApiSchema<"AuditLogEntry">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/audit_log_entry"))
}

export async function postDeanAuditViewEvent(
  body: ApiSchema<"AuditViewEventRequest">,
): Promise<ApiSchema<"AuditLogEntry">> {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/audit/view-event", { body }),
  )
}
