import { apiClient, unwrapApiResult } from "@/lib/api";
import type { ApiSchema } from "@/lib/api";

export async function getRoster(
  scope: "current" | "past" | "all",
  search = "",
) {
  const items: ApiSchema<"StudentRosterItem">[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(
      await apiClient.GET("/functions/v1/students", {
        params: {
          query: {
            assignment_scope: scope,
            ...(search.trim() ? { search: search.trim() } : {}),
            limit: 100,
            offset,
          },
        },
      }),
    );
    items.push(...page.items);
    if (items.length >= page.total_count || page.items.length === 0)
      return items;
  }
}

export async function getSelectedStudent(
  id: string,
): Promise<ApiSchema<"StudentRosterItem"> & { avatar_url?: string | null }> {
  const profiles = unwrapApiResult(
    await apiClient.GET("/rest/v1/profile", {
      params: {
        query: {
          id: `eq.${id}`,
          select: "id,student_number,avatar_url",
          limit: 1,
        },
      },
    }),
  );
  const profile = profiles.find(
    (row) => row.id.toLowerCase() === id.toLowerCase(),
  );
  if (!profile?.student_number)
    throw new Error("Student record is unavailable.");
  const rows = await getRoster("all", profile.student_number);
  const student = rows.find(
    (row) => row.student_id.toLowerCase() === id.toLowerCase(),
  );
  if (!student)
    throw new Error(
      "Student record is unavailable or outside your access scope.",
    );
  return { ...student, avatar_url: profile.avatar_url };
}
