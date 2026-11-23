import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiSchema } from "@/lib/api";
import {
  deleteStudentPhoto,
  updateStudentPhoto,
  type StudentProfileData,
} from "./student-profile.api";

/**
 * Updates the student's profile photo and invalidates the profile query on success.
 */
export function useUpdateStudentPhoto(studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiSchema<"StudentPhotoUpdateRequest">) =>
      updateStudentPhoto(studentId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<StudentProfileData>(
        ["student", studentId, "profile"],
        (prev) => (prev ? { ...prev, profile: updated } : prev),
      );
      void queryClient.invalidateQueries({
        queryKey: ["student", studentId, "profile"],
      });
    },
  });
}

/**
 * Removes the student's profile photo and invalidates the profile query on success.
 */
export function useDeleteStudentPhoto(studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteStudentPhoto(studentId),
    onSuccess: (updated) => {
      queryClient.setQueryData<StudentProfileData>(
        ["student", studentId, "profile"],
        (prev) => (prev ? { ...prev, profile: updated } : prev),
      );
      void queryClient.invalidateQueries({
        queryKey: ["student", studentId, "profile"],
      });
    },
  });
}
