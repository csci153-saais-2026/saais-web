import { expect, it, vi } from "vitest";
import { readImportLines, submitStudentImport } from "./student-import";

vi.mock("@/lib/api/catalog", () => ({
  readAllPrograms: async () => [{ id: "program", code: "BSCS" }],
  readAllCurriculumVersions: async () => [
    {
      id: "version",
      program_id: "program",
      version_label: "2024",
      status: "draft",
    },
  ],
}));
vi.mock("../shared/dh-api", () => ({
  getDepartmentAdvisers: async () => [{ id: "adviser", email: "x@y.z" }],
}));

it("rejects a row whose curriculum is not active", async () => {
  const lines = readImportLines(
    "student_number,full_name,email,program,curriculum,adviser_email\n1,Name,a@b.c,BSCS,2024,x@y.z\n",
  );
  const { results, imported } = await submitStudentImport(lines, "commit", [
    "department",
  ]);
  expect(results[0].outcome).toBe("error");
  expect(results[0].message).toBe('Curriculum "2024" for BSCS is not active.');
  expect(imported).toBe(0);
});
