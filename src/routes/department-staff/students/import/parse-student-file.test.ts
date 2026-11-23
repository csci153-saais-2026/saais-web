import { describe, expect, it, vi } from "vitest";
import {
  MAX_STUDENT_IMPORT_FILE_SIZE,
  MAX_STUDENT_IMPORT_ROWS,
  STUDENT_IMPORT_HEADERS,
} from "./student-import";
import {
  createStudentImportTemplate,
  parseStudentFile as parseWithReferences,
} from "./student-import";

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const CURRICULUM_ID = "22222222-2222-4222-8222-222222222222";
const ADVISER_ID = "33333333-3333-4333-8333-333333333333";

const references = {
  programs: [{ id: PROGRAM_ID, code: PROGRAM_ID }],
  curricula: [
    { id: CURRICULUM_ID, program_id: PROGRAM_ID, version_label: CURRICULUM_ID },
  ],
  advisers: [{ id: ADVISER_ID, email: ADVISER_ID }],
};
const parseStudentFile = (file: File) => parseWithReferences(file, references);

function csvFile(contents: string, name = "students.csv"): File {
  return new File([contents], name, { type: "text/csv" });
}

function csvRow(studentNumber = "00123", email = "maria@example.edu.ph") {
  return [
    studentNumber,
    '"Maria Santos"',
    email,
    PROGRAM_ID,
    CURRICULUM_ID,
    ADVISER_ID,
    "2026",
  ].join(",");
}

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Blob did not contain text."));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("parseStudentFile", () => {
  it("handles a BOM, blank lines, quoted commas/newlines, and string identifiers", async () => {
    const file = csvFile(
      `\uFEFF${STUDENT_IMPORT_HEADERS.join(",")}\r\n\r\n"00123","Santos, Maria\nJr.","maria@example.edu.ph",${PROGRAM_ID},${CURRICULUM_ID},${ADVISER_ID},2026\r\n`,
    );

    const result = await parseStudentFile(file);

    expect(result.rowCount).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      row_number: 3,
      student_number: "00123",
      full_name: "Santos, Maria\nJr.",
      email: "maria@example.edu.ph",
      program_id: PROGRAM_ID,
      curriculum_version_id: CURRICULUM_ID,
      adviser_id: ADVISER_ID,
      entry_year: 2026,
    });
    expect(typeof result.rows[0].student_number).toBe("string");
  });

  it("rejects malformed or unsupported headers", async () => {
    await expect(
      parseStudentFile(csvFile("student_number,full_name,email")),
    ).rejects.toThrow("Missing required columns");
    await expect(
      parseStudentFile(
        csvFile(
          `${STUDENT_IMPORT_HEADERS.join(",")},student_number\n${csvRow()}`,
        ),
      ),
    ).rejects.toThrow('duplicate "student_number"');
    await expect(
      parseStudentFile(
        csvFile(`${STUDENT_IMPORT_HEADERS.join(",")},extra\n${csvRow()},x`),
      ),
    ).rejects.toThrow('Unknown import column "extra"');
  });

  it("rejects malformed quoted CSV content", async () => {
    const file = csvFile(
      `${STUDENT_IMPORT_HEADERS.join(",")}\n"00123,"Maria",maria@example.edu.ph,${PROGRAM_ID},${CURRICULUM_ID},${ADVISER_ID},2026`,
    );

    await expect(parseStudentFile(file)).rejects.toThrow(/Line \d+:.*quote/i);
  });

  it("caps nonblank data rows at the contract maximum", async () => {
    const rows = Array.from(
      { length: MAX_STUDENT_IMPORT_ROWS + 1 },
      (_, index) =>
        csvRow(`student-${index}`, `student${index}@example.edu.ph`),
    );
    const file = csvFile(
      `${STUDENT_IMPORT_HEADERS.join(",")}\n${rows.join("\n")}`,
    );

    await expect(parseStudentFile(file)).rejects.toThrow(
      `more than ${MAX_STUDENT_IMPORT_ROWS} student rows`,
    );
  });

  it("rejects duplicate student numbers and emails within the file", async () => {
    const file = csvFile(
      `${STUDENT_IMPORT_HEADERS.join(",")}\n${csvRow()}\n${csvRow("00123", "MARIA@example.edu.ph")}`,
    );

    const result = await parseStudentFile(file);

    expect(result.rows).toHaveLength(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 2,
          message: expect.stringContaining("Duplicate"),
        }),
        expect.objectContaining({
          rowNumber: 3,
          message: expect.stringContaining("Duplicate"),
        }),
      ]),
    );
  });

  it("rejects legacy XLS files with a conversion message", async () => {
    await expect(
      parseStudentFile(csvFile("not parsed", "students.xls")),
    ).rejects.toThrow(/save the workbook as \.xlsx or export it as \.csv/i);
  });

  it("checks the file-size limit before reading file content", async () => {
    const file = csvFile(`${STUDENT_IMPORT_HEADERS.join(",")}`);
    Object.defineProperty(file, "size", {
      value: MAX_STUDENT_IMPORT_FILE_SIZE + 1,
    });
    const readAsText = vi.spyOn(FileReader.prototype, "readAsText");

    await expect(parseStudentFile(file)).rejects.toThrow("10 MiB or smaller");
    expect(readAsText).not.toHaveBeenCalled();
  });

  it("creates a CSV template with the contract row columns", async () => {
    const template = createStudentImportTemplate();

    expect(template.type).toBe("text/csv;charset=utf-8");
    expect(await blobText(template)).toBe(
      `${STUDENT_IMPORT_HEADERS.join(",")}\r\n`,
    );
  });
});
