import { z } from "zod";

export const STUDENT_NUMBER_PATTERN = /^\d{2}-\d-\d{5}$/;

export const studentNumberSchema = z
  .string()
  .trim()
  .regex(
    STUDENT_NUMBER_PATTERN,
    "Use the format YY-N-NNNNN (for example, 24-1-00124).",
  );
