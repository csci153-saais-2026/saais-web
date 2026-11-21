import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"
import { getDepartmentAdvisers } from "../shared/dh-api"

export const IMPORT_COLUMNS = ["student_number", "full_name", "email", "program", "curriculum", "adviser_email", "entry_year"] as const

export type ImportLine = Record<(typeof IMPORT_COLUMNS)[number], string> & { rowNumber: number }

/** Minimal RFC 4180 reader: quoted fields, escaped quotes and CRLF/LF line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const input = text.replace(/^\uFEFF/, "")
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index += 1 }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ",") { row.push(field); field = "" }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1
      row.push(field); field = ""
      if (row.some((cell) => cell.trim() !== "")) rows.push(row)
      row = []
    } else field += char
  }
  row.push(field)
  if (row.some((cell) => cell.trim() !== "")) rows.push(row)
  return rows
}

const normalise = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
const ALIASES: Record<string, (typeof IMPORT_COLUMNS)[number]> = {
  student_id: "student_number", student_no: "student_number", id: "student_number",
  name: "full_name", student_name: "full_name", school_email: "email",
  program_code: "program", degree_program: "program", curriculum_label: "curriculum", curriculum_version: "curriculum",
  adviser: "adviser_email",
}

export function readImportLines(text: string): ImportLine[] {
  return readImportTable(parseCsv(text))
}

function cellText(value: unknown) {
  if (value == null) return ""
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
}

function readFile<T extends string | ArrayBuffer>(read: (reader: FileReader) => void) {
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as T)
    reader.onerror = () => reject(new Error("The file could not be read."))
    read(reader)
  })
}

/** Reads a .csv or .xlsx file (first worksheet) into validated import lines. */
export async function readImportFile(file: File): Promise<ImportLine[]> {
  if (!/\.xlsx$/i.test(file.name)) return readImportLines(await readFile<string>((reader) => reader.readAsText(file)))
  try {
    const { readSheet } = await import("read-excel-file/browser")
    const sheet = await readSheet(await readFile<ArrayBuffer>((reader) => reader.readAsArrayBuffer(file)), 1)
    return readImportTable(sheet.map((cells) => cells.map(cellText)).filter((cells) => cells.some((cell) => cell.trim() !== "")))
  } catch (failure) {
    if (failure instanceof Error && /^(The file|Missing column)/.test(failure.message)) throw failure
    throw new Error("The .xlsx workbook could not be read. Check that it is a valid, unencrypted file.", { cause: failure })
  }
}

function readImportTable(table: string[][]): ImportLine[] {
  const [header, ...body] = table
  if (!header) throw new Error("The file is empty.")
  const columns = header.map((cell) => { const key = normalise(cell); return ALIASES[key] ?? key })
  const missing = IMPORT_COLUMNS.filter((name) => name !== "entry_year" && !columns.includes(name))
  if (missing.length) throw new Error(`Missing column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`)
  if (body.length === 0) throw new Error("The file has no student rows.")
  return body.map((cells, index) => {
    const line = { rowNumber: index + 2 } as ImportLine
    for (const name of IMPORT_COLUMNS) line[name] = (cells[columns.indexOf(name)] ?? "").trim()
    return line
  })
}

export type ImportOutcome = { line: ImportLine; outcome: "valid" | "warning" | "error" | "imported"; message: string }

async function lookups() {
  const [programs, versions, advisers, profiles] = await Promise.all([
    apiClient.GET("/rest/v1/program", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
    apiClient.GET("/rest/v1/curriculum_version", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
    getDepartmentAdvisers(),
    apiClient.GET("/rest/v1/profile", { params: { query: { limit: 100 } } }).then(unwrapApiResult),
  ])
  return { programs, versions, advisers, profiles }
}

/** Resolves spreadsheet text to ids and runs the API's preview (`dryRun`) or commit step. */
export async function submitStudentImport(lines: ImportLine[], mode: "preview" | "commit"): Promise<{ results: ImportOutcome[]; imported: number }> {
  const { programs, versions, advisers, profiles } = await lookups()
  const rows: ApiSchema<"StudentBatchImportRowInput">[] = []
  const local = new Map<number, string>()
  for (const line of lines) {
    const program = programs.find((item) => item.code.toLowerCase() === line.program.toLowerCase())
    const version = versions.find((item) => item.program_id === program?.id && item.version_label.toLowerCase() === line.curriculum.toLowerCase())
    const adviserProfile = profiles.find((item) => item.email.toLowerCase() === line.adviser_email.toLowerCase())
    const adviser = advisers.find((item) => item.id === adviserProfile?.id)
    const year = line.entry_year ? Number(line.entry_year) : null
    const problem = !line.student_number || !line.full_name || !line.email ? "Student ID, name and email are required."
      : !program ? `Unknown program "${line.program}".`
      : !version ? `Unknown curriculum "${line.curriculum}" for ${program.code}.`
      : !adviser ? `No active department adviser has the email "${line.adviser_email}".`
      : year !== null && !Number.isInteger(year) ? "Entry year must be a whole number."
      : ""
    if (problem || !program || !version || !adviser) { local.set(line.rowNumber, problem); continue }
    rows.push({
      row_number: line.rowNumber, student_number: line.student_number, full_name: line.full_name, email: line.email,
      program_id: program.id, curriculum_version_id: version.id, adviser_id: adviser.id, entry_year: year,
    })
  }
  const response = rows.length
    ? unwrapApiResult(await apiClient.POST("/functions/v1/students/import", { body: { mode: rows.length === lines.length ? mode : "preview", rows } }))
    : null
  const results: ImportOutcome[] = lines.map((line) => {
    if (local.has(line.rowNumber)) return { line, outcome: "error", message: local.get(line.rowNumber)! }
    const found = response?.results.find((item) => item.row_number === line.rowNumber)
    return { line, outcome: (found?.outcome ?? "error") as ImportOutcome["outcome"], message: found?.message ?? "No result was returned for this row." }
  })
  return { results, imported: response?.imported_count ?? 0 }
}
