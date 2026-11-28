import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import { z } from "zod";

export const MAX_STUDENT_IMPORT_ROWS = 500;
export const MAX_STUDENT_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

export const STUDENT_IMPORT_HEADERS = [
  "student_number",
  "full_name",
  "email",
  "program",
  "curriculum",
  "adviser_email",
  "entry_year",
] as const;

export const REQUIRED_STUDENT_IMPORT_HEADERS = STUDENT_IMPORT_HEADERS.slice(
  0,
  6,
);

export const studentImportRowSchema = z
  .object({
    row_number: z.number().int().min(1),
    student_number: z
      .string()
      .trim()
      .min(1, "Student number is required.")
      .max(64, "Student number must be 64 characters or fewer."),
    full_name: z
      .string()
      .trim()
      .min(1, "Full name is required.")
      .max(150, "Full name must be 150 characters or fewer."),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(254, "Email must be 254 characters or fewer."),
    program_id: z.uuid("Program ID must be a UUID."),
    curriculum_version_id: z.uuid("Curriculum version ID must be a UUID."),
    adviser_id: z.uuid("Adviser ID must be a UUID."),
    entry_year: z
      .number()
      .int("Entry year must be a whole number.")
      .min(1900, "Entry year must be 1900 or later.")
      .max(3000, "Entry year must be 3000 or earlier.")
      .nullable()
      .optional(),
  })
  .strict() satisfies z.ZodType<ApiSchema<"StudentBatchImportRowInput">>;

import Papa from "papaparse";

type StudentImportRow = ApiSchema<"StudentBatchImportRowInput">;

export interface StudentImportIssue {
  readonly rowNumber: number | null;
  readonly message: string;
  readonly studentNumber?: string;
}

export interface StudentImportParseResult {
  readonly rows: readonly StudentImportRow[];
  readonly rowCount: number;
  readonly issues: readonly StudentImportIssue[];
}

interface SourceRow {
  readonly rowNumber: number;
  readonly cells: readonly unknown[];
}

export interface ImportReferences {
  programs: { id: string; code: string }[];
  curricula: {
    id: string;
    program_id: string;
    version_label: string;
    status?: string;
  }[];
  advisers: { id: string; email: string }[];
}

interface CandidateRow {
  readonly rowNumber: number;
  readonly value: StudentImportRow;
}

interface ParsedRecords {
  readonly header: readonly unknown[];
  readonly rows: readonly SourceRow[];
}

// PapaParse (^5.7.1) handles CSV; read-excel-file (^9.3.17) loads for XLSX.
// The 10 MiB limit is checked before either parser reads file contents.
const STUDENT_IMPORT_FILE_SIZE_LABEL = "10 MiB";
const STUDENT_IMPORT_TEMPLATE_HEADERS = STUDENT_IMPORT_HEADERS.join(",");

function isBlankRow(cells: readonly unknown[]): boolean {
  return cells.every(
    (cell) => cell === null || cell === undefined || String(cell).trim() === "",
  );
}

function countLineBreaks(value: string): number {
  return value.match(/\r\n|\r|\n/g)?.length ?? 0;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The selected file could not be read as text."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("The selected file could not be read."));
    reader.readAsText(file, "UTF-8");
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else
        reject(
          new Error("The selected workbook could not be read as binary data."),
        );
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("The selected file could not be read."));
    reader.readAsArrayBuffer(file);
  });
}

function parseCsvRecords(text: string): ParsedRecords {
  const records: SourceRow[] = [];
  const parserErrors: string[] = [];
  let previousCursor = 0;
  let currentLine = 1;

  Papa.parse<string[]>(text, {
    delimiter: ",",
    dynamicTyping: false,
    skipEmptyLines: false,
    step: (result) => {
      const cursor = result.meta.cursor;
      const source = text.slice(previousCursor, cursor);
      const rowNumber = currentLine;
      currentLine += countLineBreaks(source);
      previousCursor = cursor;

      for (const error of result.errors) {
        parserErrors.push(
          `Line ${rowNumber}: ${error.message || "malformed CSV content."}`,
        );
      }

      records.push({ rowNumber, cells: result.data });
    },
  });

  if (parserErrors.length > 0) {
    throw new Error(parserErrors.join(" "));
  }

  const headerIndex = records.findIndex((record) => !isBlankRow(record.cells));
  if (headerIndex < 0) {
    throw new Error("The CSV file is empty.");
  }

  return {
    header: records[headerIndex].cells,
    rows: records.slice(headerIndex + 1),
  };
}

function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (
    typeof cell === "string" ||
    typeof cell === "number" ||
    typeof cell === "boolean"
  ) {
    return String(cell);
  }
  if (
    typeof cell === "object" &&
    "richText" in cell &&
    Array.isArray(cell.richText)
  ) {
    return cell.richText
      .map((part: { text?: unknown }) =>
        typeof part.text === "string" ? part.text : "",
      )
      .join("");
  }
  if (
    typeof cell === "object" &&
    "text" in cell &&
    typeof cell.text === "string"
  ) {
    return cell.text;
  }
  return "";
}

async function parseXlsxRecords(file: File): Promise<ParsedRecords> {
  try {
    const { readSheet } = await import("read-excel-file/browser");
    const worksheet = await readSheet(await readFileAsArrayBuffer(file), 1);
    if (!Array.isArray(worksheet)) {
      throw new Error("The XLSX workbook does not contain a worksheet.");
    }
    const records = worksheet.map((cells, index) => ({
      rowNumber: index + 1,
      cells,
    }));

    const headerIndex = records.findIndex(
      (record) => !isBlankRow(record.cells),
    );
    if (headerIndex < 0) {
      throw new Error("The first worksheet in the XLSX file is empty.");
    }

    return {
      header: records[headerIndex].cells,
      rows: records.slice(headerIndex + 1),
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The XLSX")) {
      throw error;
    }
    throw new Error(
      "Could not read the XLSX workbook. Check that it is a valid, unencrypted .xlsx file.",
      { cause: error },
    );
  }
}

const HEAD_IMPORT_ALIASES: Readonly<Record<string, string>> = {
  student_id: "student_number",
  student_no: "student_number",
  id: "student_number",
  name: "full_name",
  student_name: "full_name",
  school_email: "email",
  program_code: "program",
  degree_program: "program",
  curriculum_label: "curriculum",
  curriculum_version: "curriculum",
  adviser: "adviser_email",
};

function getHeaderIndexes(
  header: readonly unknown[],
  allowHeadAliases: boolean,
): Map<string, number> {
  const normalized = header.map((cell) => {
    const name = cellToText(cell)
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase();
    if (!allowHeadAliases) return name;
    const key = name.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    return Object.hasOwn(HEAD_IMPORT_ALIASES, key)
      ? HEAD_IMPORT_ALIASES[key]
      : key;
  });
  const knownHeaders = new Set<string>(STUDENT_IMPORT_HEADERS);
  const seen = new Set<string>();

  for (const name of normalized) {
    if (!name) {
      throw new Error("The import header contains a blank column name.");
    }
    if (!knownHeaders.has(name)) {
      throw new Error(
        `Unknown import column "${name}". Download the template for supported columns.`,
      );
    }
    if (seen.has(name)) {
      throw new Error(
        `The import header contains duplicate "${name}" columns.`,
      );
    }
    seen.add(name);
  }

  const missing = REQUIRED_STUDENT_IMPORT_HEADERS.filter(
    (name) => !seen.has(name),
  );
  if (missing.length > 0) {
    const label = allowHeadAliases
      ? missing.length === 1
        ? "Missing column"
        : "Missing columns"
      : "Missing required columns";
    throw new Error(`${label}: ${missing.join(", ")}.`);
  }

  return new Map(normalized.map((name, index) => [name, index]));
}

function toEntryYear(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

function parseDataRows(
  records: ParsedRecords,
  references: ImportReferences,
  allowHeadAliases: boolean,
  headerIndexes: Map<string, number>,
): StudentImportParseResult {
  const candidates: CandidateRow[] = [];
  const issues: StudentImportIssue[] = [];
  let rowCount = 0;

  for (const sourceRow of records.rows) {
    if (isBlankRow(sourceRow.cells)) continue;
    rowCount += 1;
    if (rowCount > MAX_STUDENT_IMPORT_ROWS) {
      throw new Error(
        `The file contains more than ${MAX_STUDENT_IMPORT_ROWS} student rows. Split it into smaller files.`,
      );
    }

    if (
      sourceRow.cells
        .slice(headerIndexes.size)
        .some((cell) => cellToText(cell).trim() !== "")
    ) {
      issues.push({
        rowNumber: sourceRow.rowNumber,
        message: "This row contains values beyond the supported columns.",
      });
      continue;
    }

    const textFor = (name: string) => {
      const index = headerIndexes.get(name);
      return index === undefined ? "" : cellToText(sourceRow.cells[index]);
    };
    const studentNumberIndex = headerIndexes.get("student_number");
    const studentNumberCell =
      studentNumberIndex === undefined
        ? undefined
        : sourceRow.cells[studentNumberIndex];
    const numericStudentNumber = typeof studentNumberCell === "number";
    const rawEntryYear = textFor("entry_year");
    const entryYear = toEntryYear(rawEntryYear);
    const program = references.programs.find(
      (item) =>
        item.code.toLowerCase() === textFor("program").trim().toLowerCase(),
    );
    const curriculum = references.curricula.find(
      (item) =>
        item.program_id === program?.id &&
        item.version_label.toLowerCase() ===
          textFor("curriculum").trim().toLowerCase(),
    );
    const adviser = references.advisers.find(
      (item) =>
        item.email.toLowerCase() ===
        textFor("adviser_email").trim().toLowerCase(),
    );
    const inactive = !!curriculum?.status && curriculum.status !== "active";
    const staffIssues = [
      !program ? "Unknown department program." : "",
      !curriculum ? "Unknown curriculum for this program." : "",
      inactive ? "This curriculum version is not active." : "",
      !adviser ? "No active department adviser has this email." : "",
    ].filter(Boolean);
    const referenceIssues =
      allowHeadAliases && !program
        ? [`Unknown program "${textFor("program").trim()}".`]
        : staffIssues;
    const source: Record<string, unknown> = {
      row_number: sourceRow.rowNumber,
      student_number: textFor("student_number"),
      full_name: textFor("full_name"),
      email: textFor("email"),
      program_id: program?.id,
      curriculum_version_id: inactive ? undefined : curriculum?.id,
      adviser_id: adviser?.id,
      ...(entryYear === undefined ? {} : { entry_year: entryYear }),
    };
    const parsed = studentImportRowSchema.safeParse(source);
    const rowIssues = [
      ...referenceIssues,
      ...(parsed.success
        ? []
        : parsed.error.issues
            .filter(
              (issue) =>
                !["program_id", "curriculum_version_id", "adviser_id"].includes(
                  String(issue.path[0]),
                ),
            )
            .map((issue) => issue.message)),
    ];

    if (numericStudentNumber) {
      rowIssues.push(
        "Student number cells must be stored as text to preserve leading zeroes.",
      );
    }
    if (Number.isNaN(entryYear) && rawEntryYear.trim()) {
      rowIssues.push("Entry year must be a whole number.");
    }

    if (rowIssues.length > 0 || !parsed.success) {
      issues.push({
        rowNumber: sourceRow.rowNumber,
        message: Array.from(new Set(rowIssues)).join(" "),
        studentNumber: textFor("student_number").trim(),
      });
      continue;
    }

    candidates.push({ rowNumber: sourceRow.rowNumber, value: parsed.data });
  }

  if (rowCount === 0) {
    throw new Error("No student rows were found below the header.");
  }

  const duplicateRowNumbers = new Map<number, Set<string>>();
  const firstSeen = new Map<string, number>();
  for (const candidate of candidates) {
    for (const [field, rawValue] of [
      ["student number", candidate.value.student_number],
      ["email", candidate.value.email.toLowerCase()],
    ] as const) {
      const key = `${field}:${rawValue.toLowerCase()}`;
      const firstRow = firstSeen.get(key);
      if (firstRow === undefined) {
        firstSeen.set(key, candidate.rowNumber);
        continue;
      }
      duplicateRowNumbers.set(
        candidate.rowNumber,
        duplicateRowNumbers.get(candidate.rowNumber) ?? new Set(),
      );
      duplicateRowNumbers.get(candidate.rowNumber)?.add(field);
      duplicateRowNumbers.set(
        firstRow,
        duplicateRowNumbers.get(firstRow) ?? new Set(),
      );
      duplicateRowNumbers.get(firstRow)?.add(field);
    }
  }

  for (const [rowNumber, fields] of duplicateRowNumbers) {
    issues.push({
      rowNumber,
      message: `Duplicate ${Array.from(fields).join(" and ")} within this file.`,
      studentNumber: candidates.find((row) => row.rowNumber === rowNumber)
        ?.value.student_number,
    });
  }

  const invalidRows = new Set(duplicateRowNumbers.keys());
  const validCandidates = candidates.filter(
    (candidate) => !invalidRows.has(candidate.rowNumber),
  );

  return {
    rows: validCandidates.map((candidate) => candidate.value),
    rowCount,
    issues: issues.sort(
      (left, right) => (left.rowNumber ?? 0) - (right.rowNumber ?? 0),
    ),
  };
}

export async function parseStudentFile(
  file: File,
  references: ImportReferences | (() => Promise<ImportReferences>),
  options: { allowHeadAliases?: boolean } = {},
): Promise<StudentImportParseResult> {
  if (file.size > MAX_STUDENT_IMPORT_FILE_SIZE) {
    throw new Error(
      `Files must be ${STUDENT_IMPORT_FILE_SIZE_LABEL} or smaller.`,
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xls") {
    throw new Error(
      "Legacy .xls files are not supported. Save the workbook as .xlsx or export it as .csv, then try again.",
    );
  }
  if (extension !== "csv" && extension !== "xlsx") {
    throw new Error("Choose a .csv or .xlsx file.");
  }

  const records =
    extension === "csv"
      ? parseCsvRecords((await readFileAsText(file)).replace(/^\uFEFF/, ""))
      : await parseXlsxRecords(file);

  const allowHeadAliases = options.allowHeadAliases === true;
  const headerIndexes = getHeaderIndexes(records.header, allowHeadAliases);
  const resolved =
    typeof references === "function" ? await references() : references;
  return parseDataRows(records, resolved, allowHeadAliases, headerIndexes);
}

export function createStudentImportTemplate(): Blob {
  return new Blob([`\uFEFF${STUDENT_IMPORT_TEMPLATE_HEADERS}\r\n`], {
    type: "text/csv;charset=utf-8",
  });
}

import { listEligibleDepartmentAdvisers } from "../students.api";

const LIMIT = 1000;
function complete<T>(rows: T[], label: string): T[] {
  if (rows.length >= LIMIT)
    throw new Error(`${label} reference list may be incomplete.`);
  return rows;
}

export async function loadImportReferences(
  departmentId: string,
): Promise<ImportReferences> {
  const [programResult, adviserOptions] = await Promise.all([
    apiClient.GET("/rest/v1/program", {
      params: {
        query: {
          department_id: postgrestFilter.eq(departmentId),
          limit: LIMIT,
        },
      },
    }),
    listEligibleDepartmentAdvisers(departmentId),
  ]);
  const programs = complete(
    unwrapApiResult<ApiSchema<"Program">[]>(programResult),
    "Program",
  ).filter((p) => p.department_id === departmentId);
  const programIds = programs.map((p) => p.id);
  const adviserIds = adviserOptions.map((a) => a.id);
  const batchSize = 50;
  const batches = (ids: string[]) =>
    Array.from({ length: Math.ceil(ids.length / batchSize) }, (_, index) =>
      ids.slice(index * batchSize, (index + 1) * batchSize),
    );
  const [versionBatches, profileBatches] = await Promise.all([
    Promise.all(
      batches(programIds).map((ids) =>
        apiClient
          .GET("/rest/v1/curriculum_version", {
            params: {
              query: { program_id: postgrestFilter.inList(ids), limit: LIMIT },
            },
          })
          .then((r) =>
            complete(
              unwrapApiResult<ApiSchema<"CurriculumVersion">[]>(r),
              "Curriculum",
            ),
          ),
      ),
    ),
    Promise.all(
      batches(adviserIds).map((ids) =>
        apiClient
          .GET("/rest/v1/profile", {
            params: {
              query: { id: postgrestFilter.inList(ids), limit: LIMIT },
            },
          })
          .then((r) =>
            complete(unwrapApiResult<ApiSchema<"Profile">[]>(r), "Adviser"),
          ),
      ),
    ),
  ]);
  const versions = versionBatches.flat();
  const profiles = profileBatches.flat();
  return {
    programs,
    curricula: versions.filter((v) => programIds.includes(v.program_id)),
    advisers: profiles.filter(
      (p) => adviserIds.includes(p.id) && p.status === "active",
    ),
  };
}
