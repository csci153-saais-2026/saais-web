import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api";
import type { ApiSchema } from "@/lib/api";
import { getRoster, getSelectedStudent } from "../advisees.api";
export async function getCurriculumData(id: string) {
  await getSelectedStudent(id);
  const assignments: ApiSchema<"StudentCurriculumAssignment">[] = [];
  const versions: ApiSchema<"CurriculumVersion">[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(
      await apiClient.GET("/rest/v1/student_curriculum_assignment", {
        params: {
          query: {
            student_id: postgrestFilter.eq(id),
            select:
              "id,student_id,curriculum_version_id,start_date,end_date,change_note,created_at",
            order: "start_date.desc,id.desc",
            limit: 100,
            offset,
          },
        },
      }),
    );
    if (
      page.some(
        (a) =>
          a.student_id.toLowerCase() !== id.toLowerCase() ||
          assignments.some((old) => old.id === a.id),
      )
    )
      throw new Error("Curriculum assignments did not match this student.");
    assignments.push(...page);
    if (page.length < 100) break;
  }
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(
      await apiClient.GET("/rest/v1/curriculum_version", {
        params: { query: { limit: 100, offset } },
      }),
    );
    if (page.some((v) => versions.some((old) => old.id === v.id)))
      throw new Error("Curriculum pagination returned duplicate versions.");
    versions.push(...page);
    if (page.length < 100) break;
  }
  const current = await getRoster("current");
  return {
    assignments,
    versions,
    canEdit: current.some(
      (s) => s.student_id.toLowerCase() === id.toLowerCase(),
    ),
  };
}
export async function previewShift(id: string, target: string) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/students/{student_id}/shift-preview", {
      params: { path: { student_id: id } },
      body: { curriculum_version_id: target },
    }),
  );
}
export async function endorseTransfer(
  id: string,
  target: string,
  reason: string,
) {
  return unwrapApiResult(
    await apiClient.POST(
      "/functions/v1/students/{student_id}/curriculum-transfers",
      {
        params: { path: { student_id: id } },
        body: { to_curriculum_version_id: target, endorsement_note: reason },
      },
    ),
  );
}
