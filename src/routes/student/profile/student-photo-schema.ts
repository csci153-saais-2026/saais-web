import { z } from "zod";
import type { ApiSchema } from "@/lib/api/types";

export const MAX_STUDENT_PHOTO_BYTES = 2_097_152;

export const studentPhotoMimeTypes = ["image/jpeg", "image/png"] as const;

/**
 * Client-side file metadata validation for student profile photo uploads,
 * matching `StudentProfile.html` error copy.
 */
export const studentPhotoFileSchema = z.object({
  mime_type: z.enum(studentPhotoMimeTypes, {
    error: "Choose a JPG or PNG image.",
  }),
  file_size_bytes: z.number().int().nonnegative().max(MAX_STUDENT_PHOTO_BYTES, {
    error: "That image is over 2 MB. Choose a smaller one.",
  }),
});

/**
 * Full Zod schema for student profile photo update payloads,
 * mirroring `ApiSchema<'StudentPhotoUpdateRequest'>`.
 */
export const studentPhotoSchema = studentPhotoFileSchema.extend({
  storage_object_path: z.string().nullable().optional(),
  avatar_url: z.string().min(1, "Profile photo URL is required."),
}) satisfies z.ZodType<ApiSchema<"StudentPhotoUpdateRequest">>;

export type StudentPhotoFileValues = z.infer<typeof studentPhotoFileSchema>;
export type StudentPhotoValues = z.infer<typeof studentPhotoSchema>;
