import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadIcon } from "@/components/icons";
import {
  StudentImportModal,
  type ImportPreviewRow,
} from "@/components/features/student-import-modal";
import sampleUrl from "./student-import-sample.csv?url";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api";
import {
  useStudentImportCommit,
  type StudentImportScope,
} from "@/hooks/use-student-import";
import { staffQueryKeys } from "../../shared/staff-query-keys";
import {
  MAX_STUDENT_IMPORT_FILE_SIZE,
  MAX_STUDENT_IMPORT_ROWS,
} from "./student-import";
import {
  parseStudentFile,
  type StudentImportIssue,
  type StudentImportParseResult,
} from "./student-import";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { loadImportReferences } from "./student-import";
import {
  previewStudentImport,
  type StudentImportBatchResult,
  type StudentImportPreview,
} from "./student-import.api";

const FILE_SIZE_LABEL = `${MAX_STUDENT_IMPORT_FILE_SIZE / (1024 * 1024)} MiB`;
const STUDENT_NUMBER_PATTERN = /^\d{2}-\d-\d{5}$/;
function getLocalErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "The selected file could not be read.";
}

function getImportErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return "Your account is not permitted to import students for this department.";
    }
    if (error.isAuthError) {
      return "Your session could not be verified. Sign in again and retry.";
    }
    if (error.isNetworkError) {
      return "Could not reach the student import service. Check your connection and retry.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error prevented the student import from completing.";
}

function getCanonicalNumberIssues(
  parsed: StudentImportParseResult | null,
): StudentImportIssue[] {
  if (!parsed) return [];
  const seenNumbers = new Set<string>();
  return parsed.rows.flatMap((row) => {
    const issues: StudentImportIssue[] = [];
    if (!STUDENT_NUMBER_PATTERN.test(row.student_number)) {
      issues.push({
        rowNumber: row.row_number,
        message: "Invalid ID format.",
      });
    }
    if (seenNumbers.has(row.student_number)) {
      issues.push({ rowNumber: row.row_number, message: "Duplicate ID." });
    }
    seenNumbers.add(row.student_number);
    return issues;
  });
}

export function StudentImportDialog({
  scope,
}: {
  scope: StudentImportScope | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<StudentImportParseResult | null>(null);
  const [preview, setPreview] = useState<StudentImportPreview | null>(null);
  const [importResult, setImportResult] =
    useState<StudentImportBatchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseGeneration = useRef(0);
  const importGeneration = useRef(0);
  const importAbortController = useRef<AbortController | null>(null);
  const scopeKey = scope ? `${scope.profileId}:${scope.departmentId}` : null;
  const previousScopeKey = useRef(scopeKey);
  const importMutation = useStudentImportCommit(scope);
  const queryClient = useQueryClient();
  const canonicalIssues = getCanonicalNumberIssues(parsed);
  const localIssues = parsed ? [...parsed.issues, ...canonicalIssues] : [];
  const hasFileLevelIssue = localIssues.some(
    (issue) => issue.rowNumber === null,
  );
  const importableRows = hasFileLevelIssue
    ? []
    : (parsed?.rows ?? []).filter(
        (row) =>
          !localIssues.some((issue) => issue.rowNumber === row.row_number),
      );

  const invalidateImport = useCallback(() => {
    importGeneration.current += 1;
    importAbortController.current?.abort();
    importAbortController.current = null;
    setIsImporting(false);
    setImportResult(null);
    setPreview(null);
    setImportError(null);
  }, []);

  useEffect(() => {
    if (previousScopeKey.current === scopeKey) return;
    previousScopeKey.current = scopeKey;
    if (isImporting) return;
    // Scope changes invalidate transient file/preview state created for the previous department.
    parseGeneration.current += 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParsed(null);
    setIsParsing(false);
    invalidateImport();
  }, [invalidateImport, isImporting, scopeKey]);

  useEffect(
    () => () => {
      parseGeneration.current += 1;
      importGeneration.current += 1;
      importAbortController.current?.abort();
    },
    [],
  );

  async function selectFile(file: File | undefined) {
    if (isImporting) return;
    const generation = ++parseGeneration.current;
    invalidateImport();
    setLocalError(null);
    setParsed(null);
    if (!file) {
      setIsParsing(false);
      return;
    }

    setIsParsing(true);
    try {
      if (!scope)
        throw new Error("Authorized department scope is unavailable.");
      const references = await loadImportReferences(scope.departmentId);
      const result = await parseStudentFile(file, references);
      if (generation !== parseGeneration.current) return;
      setParsed(result);
      if (
        result.issues.length === 0 &&
        getCanonicalNumberIssues(result).length === 0 &&
        result.rows.length === result.rowCount
      ) {
        const serverPreview = await previewStudentImport(result.rows);
        if (generation === parseGeneration.current) setPreview(serverPreview);
      }
    } catch (parseError) {
      if (generation === parseGeneration.current) {
        setLocalError(getLocalErrorMessage(parseError));
      }
    } finally {
      if (generation === parseGeneration.current) setIsParsing(false);
    }
  }

  async function requestImport() {
    if (
      !importableRows.length ||
      !scope ||
      importResult ||
      !preview ||
      preview.error_count > 0 ||
      localIssues.length > 0
    )
      return;
    invalidateImport();
    const generation = importGeneration.current;
    const controller = new AbortController();
    importAbortController.current = controller;
    setIsImporting(true);

    try {
      const result = await importMutation.mutateAsync({
        rows: importableRows,
        signal: controller.signal,
      });
      if (generation === importGeneration.current) {
        setImportResult(result);
        if (result.imported_count > 0 && scope) {
          void queryClient.invalidateQueries({
            queryKey: staffQueryKeys.resource(
              scope.profileId,
              scope.departmentId,
              "students",
            ),
          });
        }
      }
    } catch (error) {
      if (
        generation === importGeneration.current &&
        !controller.signal.aborted
      ) {
        setImportError(getImportErrorMessage(error));
      }
    } finally {
      if (generation === importGeneration.current) {
        importAbortController.current = null;
        setIsImporting(false);
      }
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open && isImporting) return;
    setIsOpen(open);
    if (open) return;

    parseGeneration.current += 1;
    invalidateImport();
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLocalError(null);
    setParsed(null);
  }

  const previewRows = new Map<number, ImportPreviewRow>();
  for (const row of parsed?.rows ?? [])
    previewRows.set(row.row_number, {
      rowNumber: row.row_number,
      studentNumber: row.student_number,
      tone: "pass",
      result: "Ready",
    });
  for (const result of preview?.results ?? []) {
    previewRows.set(result.row_number, {
      rowNumber: result.row_number,
      studentNumber: result.student_number,
      tone: result.outcome === "error" ? "fail" : "pass",
      result:
        result.outcome === "valid" ? "Ready" : result.message || "Warning",
    });
  }
  for (const issue of localIssues) {
    if (issue.rowNumber === null) continue;
    const previous = previewRows.get(issue.rowNumber);
    previewRows.set(issue.rowNumber, {
      rowNumber: issue.rowNumber,
      studentNumber: previous?.studentNumber ?? "—",
      tone: "fail",
      result:
        previous?.tone === "fail"
          ? previous.result + " " + issue.message
          : issue.message,
    });
  }

  return (
    <StudentImportModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      trigger={
        <Button type="button">
          <UploadIcon />
          Import spreadsheet
        </Button>
      }
      notice={
        <>
          Required columns: student_number, full_name, email, program,
          curriculum, and adviser_email. Entry year is optional.{" "}
          <a
            href={sampleUrl}
            download="student-import-sample.csv"
            className="font-semibold underline"
          >
            Download sample spreadsheet
          </a>
          . Replace the sample values with your department's records.
        </>
      }
      fileHint={`XLSX or CSV · IDs must follow YY-N-NNNNN (example: 24-1-00124). Maximum ${FILE_SIZE_LABEL}, ${MAX_STUDENT_IMPORT_ROWS} rows.`}
      fileError={localError ?? undefined}
      fileDisabled={isImporting}
      inputRef={fileInputRef}
      onFileChange={(file) => void selectFile(file)}
      rows={[...previewRows.values()].sort(
        (a, b) => Number(a.rowNumber) - Number(b.rowNumber),
      )}
      emptyMessage={
        isParsing ? "Checking the selected spreadsheet…" : undefined
      }
      cancelDisabled={isImporting}
      primaryLabel={
        isImporting
          ? "Importing…"
          : importResult
            ? "Import complete"
            : preview && !preview.error_count
              ? `Import ${preview.results.length} student${preview.results.length === 1 ? "" : "s"}`
              : "Import students"
      }
      primaryDisabled={
        !parsed ||
        !preview ||
        preview.error_count > 0 ||
        localIssues.length > 0 ||
        importableRows.length === 0 ||
        !scope ||
        isParsing ||
        isImporting ||
        Boolean(importResult)
      }
      onPrimary={() => void requestImport()}
    >
      {parsed && (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {importableRows.length} of {parsed.rowCount} rows passed local and
            canonical format checks.
          </p>
          <p className="text-xs text-muted-foreground">
            Reference existence and eligibility are checked by the server.
          </p>
        </>
      )}
      {localIssues.some((issue) => issue.rowNumber === null) && (
        <p role="alert" className="text-sm text-destructive">
          {localIssues
            .filter((issue) => issue.rowNumber === null)
            .map((issue) => issue.message)
            .join(" ")}
        </p>
      )}
      {localIssues.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Fix the rows with errors in the file, then choose it again. Nothing is
          imported until every row is valid.
        </p>
      )}
      {preview && preview.error_count > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Fix the rows with errors in the file, then choose it again. Nothing is
          imported until every row is valid.
        </p>
      )}
      {importError && (
        <div>
          <p role="alert" className="text-sm text-destructive">
            {importError}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={isParsing || isImporting}
            onClick={() => void selectFile(fileInputRef.current?.files?.[0])}
          >
            Validate file again
          </Button>
        </div>
      )}
      {isImporting && (
        <p role="status" className="text-sm text-muted-foreground">
          Importing valid rows…
        </p>
      )}
      {importResult && <ImportPreviewTable result={importResult} />}
      {scope === null && parsed && (
        <p role="alert" className="text-sm text-destructive">
          Authorized department scope is unavailable. The file remains local and
          cannot be imported.
        </p>
      )}
    </StudentImportModal>
  );
}
