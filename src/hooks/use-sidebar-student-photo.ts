import { useQuery } from "@tanstack/react-query";
import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api";
import { useStudentPhotoUrl } from "./use-student-photo-url";

export function useSidebarStudentPhoto(studentId?: string) {
  const { data } = useQuery({
    queryKey: ["sidebar-student-photo", studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const profiles = unwrapApiResult(
        await apiClient.GET("/rest/v1/profile", {
          params: {
            query: {
              id: postgrestFilter.eq(studentId!),
              select: "id,avatar_url",
              limit: 1,
            },
          },
        }),
      );
      return (
        profiles.find((profile) => profile.id === studentId)?.avatar_url ?? null
      );
    },
  });
  return useStudentPhotoUrl(data, studentId);
}
