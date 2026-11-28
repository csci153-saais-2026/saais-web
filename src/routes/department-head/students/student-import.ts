import {
  loadImportReferences,
  parseStudentFile,
  type StudentImportParseResult,
} from "../../department-staff/students/import/student-import";
import {
  commitStudentImport,
  previewStudentImport,
} from "../../department-staff/students/import/student-import.api";

export type ImportOutcome = {
  rowNumber: number | string;
  studentNumber: string;
  outcome: "valid" | "warning" | "error" | "imported";
  message: string;
};

export async function parseHeadStudentImport(
  file: File,
  departmentIds: readonly string[],
): Promise<StudentImportParseResult> {
  if (departmentIds.length === 0) {
    throw new Error("An active department head assignment is required.");
  }
  const byDepartment = await Promise.all(
    [...new Set(departmentIds)].map((departmentId) =>
      loadImportReferences(departmentId),
    ),
  );
  return parseStudentFile(
    file,
    {
      programs: byDepartment.flatMap(({ programs }) => programs),
      curricula: byDepartment.flatMap(({ curricula }) => curricula),
      advisers: byDepartment.flatMap(({ advisers }) => advisers),
    },
    { allowHeadAliases: true },
  );
}

export async function submitStudentImport(
  parsed: StudentImportParseResult,
  mode: "preview" | "commit",
): Promise<{ results: ImportOutcome[]; imported: number }> {
  const local: ImportOutcome[] = parsed.issues.map((issue, index) => ({
    rowNumber: issue.rowNumber ?? `File ${index + 1}`,
    studentNumber: issue.studentNumber ?? "",
    outcome: "error",
    message: issue.message,
  }));
  if (mode === "commit" && local.length > 0) {
    throw new Error("Fix the file errors before importing.");
  }
  const response = parsed.rows.length
    ? await (mode === "preview" ? previewStudentImport : commitStudentImport)(
        parsed.rows,
      )
    : null;
  const results: ImportOutcome[] = (response?.results ?? []).map((row) => ({
    rowNumber: row.row_number,
    studentNumber: row.student_number,
    outcome: row.outcome,
    message: row.message ?? "",
  }));
  return {
    results: [...local, ...results].sort(
      (left, right) => Number(left.rowNumber) - Number(right.rowNumber),
    ),
    imported: response?.imported_count ?? 0,
  };
}
