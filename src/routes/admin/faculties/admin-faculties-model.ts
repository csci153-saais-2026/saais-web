import type { ApiSchema } from "@/lib/api";

export const FACULTY_CATALOG_LIMIT = 1000;

export interface FacultyFormValues {
  readonly name: string;
  readonly code: string;
}

export interface DepartmentFormValues extends FacultyFormValues {
  readonly facultyId: string;
}

export type FacultyFormErrors = Partial<
  Record<keyof FacultyFormValues, string>
>;
export type DepartmentFormErrors = Partial<
  Record<keyof DepartmentFormValues, string>
>;

function validateNameAndCode(values: FacultyFormValues) {
  const errors: FacultyFormErrors = {};
  const name = values.name.trim();
  const code = values.code.trim();

  if (name.length < 2 || name.length > 250) {
    errors.name = "Enter a name between 2 and 250 characters.";
  }
  if (code && (code.length > 50 || !/\S/.test(code))) {
    errors.code = "Enter a code of 50 characters or fewer.";
  }

  return errors;
}

export function validateFacultyForm(
  values: FacultyFormValues,
): FacultyFormErrors {
  return validateNameAndCode(values);
}

export function validateDepartmentForm(
  values: DepartmentFormValues,
  faculties: readonly Pick<ApiSchema<"Faculty">, "id">[],
): DepartmentFormErrors {
  const errors: DepartmentFormErrors = validateNameAndCode(values);
  if (!faculties.some((faculty) => faculty.id === values.facultyId)) {
    errors.facultyId = "Select a faculty.";
  }
  return errors;
}

export function buildFacultyRequest(
  values: FacultyFormValues,
): Pick<ApiSchema<"FacultyInsert">, "name" | "code"> {
  return {
    name: values.name.trim(),
    code: values.code.trim() || null,
  };
}

export function buildDepartmentRequest(
  values: DepartmentFormValues,
): Pick<ApiSchema<"DepartmentInsert">, "faculty_id" | "name" | "code"> {
  return {
    faculty_id: values.facultyId,
    name: values.name.trim(),
    code: values.code.trim() || null,
  };
}
