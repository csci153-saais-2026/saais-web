import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api";
import type { ApiSchema } from "@/lib/api";
import { getRoster } from "../advisees/advisees.api";
export async function getFlags() {
  const roster = await getRoster("current");
  const flags: ApiSchema<"GradeFlag">[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(
      await apiClient.GET("/rest/v1/grade_flag", {
        params: { query: { status: "eq.open", limit: 100, offset } },
      }),
    );
    if (page.some((f) => flags.some((o) => o.id === f.id)))
      throw new Error("Grade flag pagination returned duplicates.");
    flags.push(...page);
    if (page.length < 100) break;
  }
  const visible = flags.filter((f) =>
    roster.some((s) => s.student_id === f.student_id),
  );
  const attempts: ApiSchema<"AttemptResult">[] = [];
  const offerings: ApiSchema<"CourseOffering">[] = [];
  const courses: ApiSchema<"Course">[] = [];
  const batches = (ids: string[]) => {
    const unique = [...new Set(ids)];
    return Array.from({ length: Math.ceil(unique.length / 50) }, (_, i) =>
      unique.slice(i * 50, i * 50 + 50),
    );
  };
  for (const batch of batches(visible.map((f) => f.attempt_id)))
    attempts.push(
      ...unwrapApiResult(
        await apiClient.GET("/rest/v1/attempt_result", {
          params: { query: { id: postgrestFilter.inList(batch), limit: 100 } },
        }),
      ),
    );
  for (const batch of batches(attempts.map((a) => a.course_offering_id)))
    offerings.push(
      ...unwrapApiResult(
        await apiClient.GET("/rest/v1/course_offering", {
          params: { query: { id: postgrestFilter.inList(batch), limit: 100 } },
        }),
      ),
    );
  for (const batch of batches(offerings.map((o) => o.course_id)))
    courses.push(
      ...unwrapApiResult(
        await apiClient.GET("/rest/v1/course", {
          params: { query: { id: postgrestFilter.inList(batch), limit: 100 } },
        }),
      ),
    );
  return { flags: visible, roster, attempts, offerings, courses };
}
export async function resolveFlag(
  id: string,
  body: ApiSchema<"GradeFlagResolveRequest">,
) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/grade-flags/{flag_id}/resolve", {
      params: { path: { flag_id: id } },
      body,
    }),
  );
}
