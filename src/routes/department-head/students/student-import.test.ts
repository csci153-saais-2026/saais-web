import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseHeadStudentImport, submitStudentImport } from "./student-import";
import { loadImportReferences } from "../../department-staff/students/import/student-import";
import {
  commitStudentImport,
  previewStudentImport,
} from "../../department-staff/students/import/student-import.api";

vi.mock(
  "../../department-staff/students/import/student-import",
  async (load) => ({
    ...(await load<object>()),
    loadImportReferences: vi.fn(),
  }),
);
vi.mock("../../department-staff/students/import/student-import.api", () => ({
  commitStudentImport: vi.fn(),
  previewStudentImport: vi.fn(),
}));

const program = "00000000-0000-4000-8000-000000001001";
const version = "00000000-0000-4000-8000-000000001002";
const adviser = "00000000-0000-4000-8000-000000001003";
const references = (status: string) => ({
  programs: [{ id: program, code: "BSCS" }],
  curricula: [
    { id: version, program_id: program, version_label: "2024", status },
  ],
  advisers: [{ id: adviser, email: "adviser@vsu.edu.ph" }],
});
const header =
  "Student ID,Name,School Email,Program Code,Curriculum Version,Adviser";
const line = (id: string) =>
  `${id},QA Student,${id}@vsu.edu.ph,BSCS,2024,adviser@vsu.edu.ph`;
const csv = (content: string) => new File([content], "students.csv");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadImportReferences).mockResolvedValue(references("active"));
});

describe("department head student import", () => {
  it("uses the shared parser, preserves aliases and physical row numbers, and loads each scoped department once", async () => {
    const result = await parseHeadStudentImport(
      csv(`${header}\n\n${line("001")}\n\n\n${line("002")}\n`),
      ["department-a", "department-b", "department-a"],
    );
    expect(loadImportReferences).toHaveBeenCalledTimes(2);
    expect(loadImportReferences).toHaveBeenCalledWith("department-a");
    expect(loadImportReferences).toHaveBeenCalledWith("department-b");
    expect(result.issues).toEqual([]);
    expect(
      result.rows.map((row) => [row.row_number, row.student_number]),
    ).toEqual([
      [3, "001"],
      [6, "002"],
    ]);
  });

  it("enforces the shared 500-row cap", async () => {
    await expect(
      parseHeadStudentImport(
        csv([header, ...Array(501).fill(line("001"))].join("\n")),
        ["department"],
      ),
    ).rejects.toThrow("more than 500");
  });

  it("rejects inactive curricula and avoids sending invalid rows", async () => {
    vi.mocked(loadImportReferences).mockResolvedValue(references("draft"));
    const parsed = await parseHeadStudentImport(
      csv(`${header}\n${line("001")}\n`),
      ["department"],
    );
    const preview = await submitStudentImport(parsed, "preview");
    expect(preview.results).toMatchObject([
      {
        rowNumber: 2,
        studentNumber: "001",
        outcome: "error",
        message: expect.stringContaining("not active"),
      },
    ]);
    expect(previewStudentImport).not.toHaveBeenCalled();
    await expect(submitStudentImport(parsed, "commit")).rejects.toThrow(
      "Fix the file errors",
    );
    expect(commitStudentImport).not.toHaveBeenCalled();
  });
});
