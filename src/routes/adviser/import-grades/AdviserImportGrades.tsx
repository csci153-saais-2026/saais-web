import { useRef, useState } from "react";
import { AdviserPage } from "../Adviser";
import { useAuth } from "@/hooks/use-auth";
import { apiClient, unwrapApiResult } from "@/lib/api";
import type { ApiSchema } from "@/lib/api";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileUpload } from "@/components/features/file-upload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ImportRequest = ApiSchema<"GradeBatchImportRequest">;
type ImportResponse = ApiSchema<"GradeBatchImportResponse">;

const TEMPLATE = {
  school_term_id: "",
  rows: [
    {
      row_number: 1,
      student_number: "",
      course_code: "",
      instructor: "",
      midterm_grade: null,
      final_grade: null,
    },
  ],
};

function downloadTemplate() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "grade-import-template.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

function ImportForm() {
  const [fileName, setFileName] = useState("");
  const [input, setInput] = useState<ImportRequest | null>(null);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileRevision = useRef(0);
  const [uploadKey, setUploadKey] = useState(0);

  function reset() {
    fileRevision.current++;
    setFileName("");
    setInput(null);
    setPreview(null);
    setError("");
    setUploadKey((n) => n + 1);
  }

  async function post(body: ImportRequest, mode: "preview" | "commit") {
    return unwrapApiResult(
      await apiClient.POST("/functions/v1/grades/import", {
        body: { ...body, mode },
      }),
    );
  }

  async function read(file: File | undefined) {
    const current = ++fileRevision.current;
    setInput(null);
    setPreview(null);
    setError("");
    setMessage("");
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    try {
      const value: unknown = JSON.parse(await file.text());
      if (current !== fileRevision.current) return;
      if (
        !value ||
        typeof value !== "object" ||
        !("school_term_id" in value) ||
        typeof value.school_term_id !== "string" ||
        !("rows" in value) ||
        !Array.isArray(value.rows) ||
        !value.rows.length
      ) {
        throw new Error(
          "No rows found. The file needs a school_term_id and a rows list. Download the template to see the expected shape.",
        );
      }
      if (!value.school_term_id)
        throw new Error("The file is missing a school_term_id.");
      const body: ImportRequest = {
        school_term_id: value.school_term_id,
        rows: value.rows,
        mode: "preview",
      };
      const result = await post(body, "preview");
      if (current !== fileRevision.current) return;
      setInput(body);
      setPreview(result);
    } catch (e) {
      if (current === fileRevision.current) {
        setFileName("");
        setError(
          e instanceof SyntaxError
            ? `${file.name} is not valid JSON, so nothing was read. Download the template to see the expected shape.`
            : e instanceof Error
              ? e.message
              : "Unable to read file.",
        );
      }
    } finally {
      if (current === fileRevision.current) setBusy(false);
    }
  }

  async function save() {
    if (!input) return;
    setBusy(true);
    setError("");
    try {
      const result = await post(input, "commit");
      setMessage(
        `Saved ${result.imported_count} grade ${plural(result.imported_count, "row", "rows")}. GWA is recomputed for the affected advisees and the import is in the audit log.`,
      );
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  const rejected =
    preview?.results.filter((row) => row.outcome === "error") ?? [];

  return (
    <>
      <PageHeading
        title="Import grades (JSON)"
        subtitle="For many advisees or terms at once"
        actions={
          <Button variant="outline" onClick={downloadTemplate}>
            <DownloadIcon /> Download template
          </Button>
        }
      />
      <Panel
        title="Upload a file"
        description="Every row is checked before anything is saved."
      >
        <FileUpload
          key={uploadKey}
          accept="application/json,.json"
          disabled={busy}
          onFile={(file) => void read(file)}
        />
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert variant="success" className="mt-4" role="status">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </Panel>
      {preview && (
        <Panel title="Check results">
          <h3 className="mb-4 text-xl font-bold">{fileName}</h3>
          <Alert
            variant={preview.valid_count ? "success" : "destructive"}
            role="status"
          >
            <AlertDescription>
              {preview.valid_count}{" "}
              {plural(preview.valid_count, "row is", "rows are")} valid
              {preview.valid_count ? " and ready to save." : "."}
            </AlertDescription>
          </Alert>
          {rejected.length > 0 && (
            <Alert variant="advisory" className="mt-3" role="status">
              <AlertDescription>
                {rejected.length}{" "}
                {plural(rejected.length, "row was", "rows were")} rejected.
                Nothing is saved until you confirm.
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-17.5 text-right">Row</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.results.map((row) => (
                  <TableRow key={row.row_number}>
                    <TableCell className="text-right">
                      {row.row_number}
                    </TableCell>
                    <TableCell className="font-mono text-[13px]">
                      {row.student_number || "—"}
                    </TableCell>
                    <TableCell>{row.course_code || "—"}</TableCell>
                    <TableCell>
                      {row.outcome === "error" ? (
                        <StatusBadge status="failed">Rejected</StatusBadge>
                      ) : (
                        <StatusBadge status="passed">Valid</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {row.outcome === "error" ? row.message : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-5 flex gap-2.5">
            <Button
              disabled={busy || preview.valid_count === 0}
              onClick={() => void save()}
            >
              {busy
                ? "Saving…"
                : `Save the ${preview.valid_count} valid ${plural(preview.valid_count, "row", "rows")}`}
            </Button>
            <Button variant="outline" disabled={busy} onClick={reset}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}
    </>
  );
}

export default function AdviserImportGrades() {
  const { user } = useAuth();
  return (
    <AdviserPage title="Import grades" sample={false}>
      {user && <ImportForm key={user.id} />}
    </AdviserPage>
  );
}
