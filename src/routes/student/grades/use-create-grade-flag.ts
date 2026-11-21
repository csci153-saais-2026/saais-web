import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ApiSchema } from "@/lib/api"
import { createStudentGradeFlag } from "./student-grades.api"

/**
 * Submits a grade flag for the student and invalidates related queries on success.
 */
export function useCreateGradeFlag(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ApiSchema<"GradeFlagCreateRequest">) =>
      createStudentGradeFlag(studentId, payload),
    onSuccess: (created) => {
      queryClient.setQueryData<ApiSchema<"GradeFlag">[]>(
        ["student", studentId, "grade-flags"],
        (prev) => (prev ? [created, ...prev] : [created])
      )
      void queryClient.invalidateQueries({
        queryKey: ["student", studentId, "grade-flags"],
      })
      void queryClient.invalidateQueries({
        queryKey: ["student", studentId, "academic-summary"],
      })
    },
  })
}
