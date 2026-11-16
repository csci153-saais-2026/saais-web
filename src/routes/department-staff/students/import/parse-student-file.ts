import Papa from 'papaparse'
import type { ApiSchema } from '@/lib/api'
import {
  MAX_STUDENT_IMPORT_FILE_SIZE,
  MAX_STUDENT_IMPORT_ROWS,
  REQUIRED_STUDENT_IMPORT_HEADERS,
  STUDENT_IMPORT_HEADERS,
  studentImportRowSchema,
} from './student-import.schema'

type StudentImportRow = ApiSchema<'StudentBatchImportRowInput'>

export interface StudentImportIssue {
  readonly rowNumber: number | null
  readonly message: string
}

export interface StudentImportParseResult {
  readonly rows: readonly StudentImportRow[]
  readonly rowCount: number
  readonly issues: readonly StudentImportIssue[]
}

interface SourceRow {
  readonly rowNumber: number
  readonly cells: readonly unknown[]
}

interface CandidateRow {
  readonly rowNumber: number
  readonly value: StudentImportRow
}

interface ParsedRecords {
  readonly header: readonly unknown[]
  readonly rows: readonly SourceRow[]
}

// PapaParse (^5.7.1) handles CSV; read-excel-file (^9.3.17) loads for XLSX.
// The 10 MiB limit is checked before either parser reads file contents.
const STUDENT_IMPORT_FILE_SIZE_LABEL = '10 MiB'
const STUDENT_IMPORT_TEMPLATE_HEADERS = STUDENT_IMPORT_HEADERS.join(',')

function isBlankRow(cells: readonly unknown[]): boolean {
  return cells.every(
    (cell) => cell === null || cell === undefined || String(cell).trim() === '',
  )
}

function countLineBreaks(value: string): number {
  return value.match(/\r\n|\r|\n/g)?.length ?? 0
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The selected file could not be read as text.'))
    }
    reader.onerror = () =>
      reject(reader.error ?? new Error('The selected file could not be read.'))
    reader.readAsText(file, 'UTF-8')
  })
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error('The selected workbook could not be read as binary data.'))
    }
    reader.onerror = () =>
      reject(reader.error ?? new Error('The selected file could not be read.'))
    reader.readAsArrayBuffer(file)
  })
}

function parseCsvRecords(text: string): ParsedRecords {
  const records: SourceRow[] = []
  const parserErrors: string[] = []
  let previousCursor = 0
  let currentLine = 1

  Papa.parse<string[]>(text, {
    delimiter: ',',
    dynamicTyping: false,
    skipEmptyLines: false,
    step: (result) => {
      const cursor = result.meta.cursor
      const source = text.slice(previousCursor, cursor)
      const rowNumber = currentLine
      currentLine += countLineBreaks(source)
      previousCursor = cursor

      for (const error of result.errors) {
        parserErrors.push(
          `Line ${rowNumber}: ${error.message || 'malformed CSV content.'}`,
        )
      }

      records.push({ rowNumber, cells: result.data })
    },
  })

  if (parserErrors.length > 0) {
    throw new Error(parserErrors.join(' '))
  }

  const headerIndex = records.findIndex((record) => !isBlankRow(record.cells))
  if (headerIndex < 0) {
    throw new Error('The CSV file is empty.')
  }

  return {
    header: records[headerIndex].cells,
    rows: records.slice(headerIndex + 1),
  }
}

function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  if (
    typeof cell === 'string' ||
    typeof cell === 'number' ||
    typeof cell === 'boolean'
  ) {
    return String(cell)
  }
  if (
    typeof cell === 'object' &&
    'richText' in cell &&
    Array.isArray(cell.richText)
  ) {
    return cell.richText
      .map((part: { text?: unknown }) =>
        typeof part.text === 'string' ? part.text : '',
      )
      .join('')
  }
  if (
    typeof cell === 'object' &&
    'text' in cell &&
    typeof cell.text === 'string'
  ) {
    return cell.text
  }
  return ''
}

async function parseXlsxRecords(file: File): Promise<ParsedRecords> {
  try {
    const { readSheet } = await import('read-excel-file/browser')
    const worksheet = await readSheet(await readFileAsArrayBuffer(file), 1)
    if (!Array.isArray(worksheet)) {
      throw new Error('The XLSX workbook does not contain a worksheet.')
    }
    const records = worksheet.map((cells, index) => ({
      rowNumber: index + 1,
      cells,
    }))

    const headerIndex = records.findIndex((record) => !isBlankRow(record.cells))
    if (headerIndex < 0) {
      throw new Error('The first worksheet in the XLSX file is empty.')
    }

    return {
      header: records[headerIndex].cells,
      rows: records.slice(headerIndex + 1),
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('The XLSX')) {
      throw error
    }
    throw new Error(
      'Could not read the XLSX workbook. Check that it is a valid, unencrypted .xlsx file.',
      { cause: error },
    )
  }
}

function getHeaderIndexes(header: readonly unknown[]): Map<string, number> {
  const normalized = header.map((cell) =>
    cellToText(cell)
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase(),
  )
  const knownHeaders = new Set<string>(STUDENT_IMPORT_HEADERS)
  const seen = new Set<string>()

  for (const name of normalized) {
    if (!name) {
      throw new Error('The import header contains a blank column name.')
    }
    if (!knownHeaders.has(name)) {
      throw new Error(`Unknown import column "${name}". Download the template for supported columns.`)
    }
    if (seen.has(name)) {
      throw new Error(`The import header contains duplicate "${name}" columns.`)
    }
    seen.add(name)
  }

  const missing = REQUIRED_STUDENT_IMPORT_HEADERS.filter(
    (name) => !seen.has(name),
  )
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}.`)
  }

  return new Map(normalized.map((name, index) => [name, index]))
}

function toEntryYear(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!/^\d+$/.test(trimmed)) return Number.NaN
  return Number(trimmed)
}

function parseDataRows(
  records: ParsedRecords,
): StudentImportParseResult {
  const headerIndexes = getHeaderIndexes(records.header)
  const candidates: CandidateRow[] = []
  const issues: StudentImportIssue[] = []
  let rowCount = 0

  for (const sourceRow of records.rows) {
    if (isBlankRow(sourceRow.cells)) continue
    rowCount += 1
    if (rowCount > MAX_STUDENT_IMPORT_ROWS) {
      throw new Error(
        `The file contains more than ${MAX_STUDENT_IMPORT_ROWS} student rows. Split it into smaller files.`,
      )
    }

    if (
      sourceRow.cells
        .slice(headerIndexes.size)
        .some((cell) => cellToText(cell).trim() !== '')
    ) {
      issues.push({
        rowNumber: sourceRow.rowNumber,
        message: 'This row contains values beyond the supported columns.',
      })
      continue
    }

    const textFor = (name: string) => {
      const index = headerIndexes.get(name)
      return index === undefined ? '' : cellToText(sourceRow.cells[index])
    }
    const studentNumberIndex = headerIndexes.get('student_number')
    const studentNumberCell =
      studentNumberIndex === undefined
        ? undefined
        : sourceRow.cells[studentNumberIndex]
    const numericStudentNumber = typeof studentNumberCell === 'number'
    const rawEntryYear = textFor('entry_year')
    const entryYear = toEntryYear(rawEntryYear)
    const source: Record<string, unknown> = {
      row_number: sourceRow.rowNumber,
      student_number: textFor('student_number'),
      full_name: textFor('full_name'),
      email: textFor('email'),
      program_id: textFor('program_id'),
      curriculum_version_id: textFor('curriculum_version_id'),
      adviser_id: textFor('adviser_id'),
      ...(entryYear === undefined ? {} : { entry_year: entryYear }),
    }
    const parsed = studentImportRowSchema.safeParse(source)
    const rowIssues = parsed.success
      ? []
      : parsed.error.issues.map((issue) => issue.message)

    if (numericStudentNumber) {
      rowIssues.push(
        'Student number cells must be stored as text to preserve leading zeroes.',
      )
    }
    if (Number.isNaN(entryYear) && rawEntryYear.trim()) {
      rowIssues.push('Entry year must be a whole number.')
    }

    if (rowIssues.length > 0 || !parsed.success) {
      issues.push({
        rowNumber: sourceRow.rowNumber,
        message: Array.from(new Set(rowIssues)).join(' '),
      })
      continue
    }

    candidates.push({ rowNumber: sourceRow.rowNumber, value: parsed.data })
  }

  if (rowCount === 0) {
    throw new Error('No student rows were found below the header.')
  }

  const duplicateRowNumbers = new Map<number, Set<string>>()
  const firstSeen = new Map<string, number>()
  for (const candidate of candidates) {
    for (const [field, rawValue] of [
      ['student number', candidate.value.student_number],
      ['email', candidate.value.email.toLowerCase()],
    ] as const) {
      const key = `${field}:${rawValue.toLowerCase()}`
      const firstRow = firstSeen.get(key)
      if (firstRow === undefined) {
        firstSeen.set(key, candidate.rowNumber)
        continue
      }
      duplicateRowNumbers.set(
        candidate.rowNumber,
        duplicateRowNumbers.get(candidate.rowNumber) ?? new Set(),
      )
      duplicateRowNumbers.get(candidate.rowNumber)?.add(field)
      duplicateRowNumbers.set(
        firstRow,
        duplicateRowNumbers.get(firstRow) ?? new Set(),
      )
      duplicateRowNumbers.get(firstRow)?.add(field)
    }
  }

  for (const [rowNumber, fields] of duplicateRowNumbers) {
    issues.push({
      rowNumber,
      message: `Duplicate ${Array.from(fields).join(' and ')} within this file.`,
    })
  }

  const invalidRows = new Set(duplicateRowNumbers.keys())
  const validCandidates = candidates.filter(
    (candidate) => !invalidRows.has(candidate.rowNumber),
  )

  return {
    rows: validCandidates.map((candidate) => candidate.value),
    rowCount,
    issues: issues.sort((left, right) => (left.rowNumber ?? 0) - (right.rowNumber ?? 0)),
  }
}

export async function parseStudentFile(
  file: File,
): Promise<StudentImportParseResult> {
  if (file.size > MAX_STUDENT_IMPORT_FILE_SIZE) {
    throw new Error(
      `Files must be ${STUDENT_IMPORT_FILE_SIZE_LABEL} or smaller.`,
    )
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'xls') {
    throw new Error(
      'Legacy .xls files are not supported. Save the workbook as .xlsx or export it as .csv, then try again.',
    )
  }
  if (extension !== 'csv' && extension !== 'xlsx') {
    throw new Error('Choose a .csv or .xlsx file.')
  }

  const records =
    extension === 'csv'
      ? parseCsvRecords((await readFileAsText(file)).replace(/^\uFEFF/, ''))
      : await parseXlsxRecords(file)

  return parseDataRows(records)
}

export function createStudentImportTemplate(): Blob {
  return new Blob([`\uFEFF${STUDENT_IMPORT_TEMPLATE_HEADERS}\r\n`], {
    type: 'text/csv;charset=utf-8',
  })
}
