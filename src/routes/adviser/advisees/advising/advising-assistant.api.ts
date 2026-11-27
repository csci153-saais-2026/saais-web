import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";

type Message = ApiSchema<"AdvisingAIMessage">;

export async function getAdvisingAssistantHistory(
  studentId: string,
): Promise<Message[]> {
  return unwrapApiResult(
    await apiClient.GET("/functions/v1/students/{student_id}/assistant", {
      params: { path: { student_id: studentId } },
      signal: AbortSignal.timeout(10_000),
    }),
  );
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
