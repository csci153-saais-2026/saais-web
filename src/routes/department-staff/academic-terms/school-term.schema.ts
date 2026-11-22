import {
  schoolTermFormSchema,
  type SchoolTermFormValues,
} from "@/lib/validation/school-term.schema";
import type { ApiSchema } from "@/lib/api";
export { schoolTermFormSchema };
export type { SchoolTermFormValues };

export function schoolTermInsertRequest(
  values: SchoolTermFormValues,
): ApiSchema<"SchoolTermInsert"> {
  const parsed = schoolTermFormSchema.parse(values);
  return {
    start_year: parsed.start_year,
    end_year: parsed.end_year,
    term_type: parsed.term_type,
    starts_on: parsed.starts_on,
    ends_on: parsed.ends_on,
    encoding_deadline: parsed.encoding_deadline,
    is_locked: false,
  };
}

export function schoolTermUpdateRequest(
  values: SchoolTermFormValues,
): Omit<ApiSchema<"SchoolTermUpdate">, "is_locked"> {
  const parsed = schoolTermFormSchema.parse(values);
  return {
    start_year: parsed.start_year,
    end_year: parsed.end_year,
    term_type: parsed.term_type,
    starts_on: parsed.starts_on,
    ends_on: parsed.ends_on,
    encoding_deadline: parsed.encoding_deadline,
  };
}
