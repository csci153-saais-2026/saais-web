import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabase/client";

type Message = ApiSchema<"AdvisingAIMessage">;

function isMessage(value: unknown): value is Message {
  const item = value as Partial<Message> | null;
  return (
    (item?.role === "user" || item?.role === "assistant") &&
    typeof item.content === "string"
  );
}

/**
 * Loads the signed-in adviser's saved conversation about a student. This is a
 * database function rather than an OpenAPI operation, so it bypasses apiClient.
 */
export async function getAdvisingAssistantHistory(
  studentId: string,
): Promise<Message[]> {
  const { data, error } = await getSupabaseClient()
    .rpc("saais_get_assistant_history", { p_student_id: studentId })
    .abortSignal(AbortSignal.timeout(10_000));
  if (error || !Array.isArray(data)) {
    throw new Error("Could not load the saved conversation.");
  }
  return data.filter(isMessage).slice(-20);
}

export async function askAdvisingAssistant(
  studentId: string,
  message: string,
  history: Message[],
) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/students/{student_id}/assistant", {
      params: { path: { student_id: studentId } },
      body: { message, history: history.slice(-20) },
    }),
  );
}
