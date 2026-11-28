import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  StudentImportModal,
  type ImportPreviewRow,
} from "@/components/features/student-import-modal";
import { useNotify } from "../shared/notify-context";
import { useHeadDepartmentIds } from "../shared/use-head-department-ids";
import {
  parseHeadStudentImport,
  submitStudentImport,
  type ImportOutcome,
} from "./student-import";
import type { StudentImportParseResult } from "../../department-staff/students/import/student-import";

export function StudentImportDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const notify = useNotify();
  const departmentIds = useHeadDepartmentIds();
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<StudentImportParseResult | null>(null);
  const [results, setResults] = useState<ImportOutcome[] | null>(null);
  const [busy, setBusy] = useState(false);

  const errors = results?.filter((row) => row.outcome === "error").length ?? 0;
  const imported =
    !!results?.length && results.every((row) => row.outcome === "imported");

  async function choose(file: File | null) {
    setError("");
    setResults(null);
    setParsed(null);
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setError("Choose a .xlsx or .csv file.");
      return;
    }
    setBusy(true);
    try {
      const next = await parseHeadStudentImport(file, departmentIds);
      const outcome = await submitStudentImport(next, "preview");
      setParsed(next);
      setResults(outcome.results);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The file could not be checked.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!parsed || !results || errors > 0 || imported || busy) return;
    setError("");
    setBusy(true);
    try {
      const outcome = await submitStudentImport(parsed, "commit");
      setResults(outcome.results);
      await client.invalidateQueries({ queryKey: ["department-head"] });
      notify(
        `Imported ${outcome.imported} student${outcome.imported === 1 ? "" : "s"}.`,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The students could not be imported.",
      );
    } finally {
      setBusy(false);
    }
  }

  const rows: ImportPreviewRow[] = (results ?? []).map((row) => ({
    rowNumber: row.rowNumber,
    studentNumber: row.studentNumber,
    tone: row.outcome === "error" ? "fail" : "pass",
    result:
      row.outcome === "error" || row.outcome === "warning"
        ? row.message || "Warning"
        : row.outcome === "imported"
          ? "Imported"
          : "Ready",
  }));

  return (
    <StudentImportModal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      notice="Required columns: student name, student ID, school email, program, curriculum, and adviser."
      fileError={error}
      fileDisabled={busy}
      onFileChange={(file) => void choose(file ?? null)}
      rows={rows}
      emptyMessage={busy ? "Checking the selected spreadsheet…" : undefined}
      cancelDisabled={busy}
      primaryDisabled={!results || errors > 0 || imported || busy}
      primaryLabel={
        busy && results
          ? "Importing…"
          : imported
            ? "Import complete"
            : results && errors === 0
              ? `Import ${results.length} student${results.length === 1 ? "" : "s"}`
              : "Import students"
      }
      onPrimary={() => void commit()}
    >
      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          {results
            ? "Importing valid rows…"
            : "Checking the selected spreadsheet…"}
        </p>
      )}
      {results && (
        <p role="status" className="text-sm text-muted-foreground">
          {imported
            ? `${results.length} imported`
            : `${results.length - errors} valid · ${errors} with errors`}
        </p>
      )}
      {errors > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Fix the rows with errors in the file, then choose it again. Nothing is
          imported until every row is valid.
        </p>
      )}
    </StudentImportModal>
  );
}
