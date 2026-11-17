import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { FormField } from "@/components/features/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useNotify } from "../shared/notify-context"
import { IMPORT_COLUMNS, readImportLines, submitStudentImport, type ImportLine, type ImportOutcome } from "./student-import"

function readFileText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("The file could not be read."))
    reader.readAsText(file)
  })
}

const LABELS: Record<ImportOutcome["outcome"], string> = { valid: "Valid", warning: "Warning", error: "Error", imported: "Imported" }

export function StudentImportDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient()
  const notify = useNotify()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [lines, setLines] = useState<ImportLine[]>([])
  const [results, setResults] = useState<ImportOutcome[] | null>(null)
  const [busy, setBusy] = useState(false)

  const errors = results?.filter((row) => row.outcome === "error").length ?? 0
  const imported = results?.every((row) => row.outcome === "imported") ?? false

  async function run(mode: "preview" | "commit") {
    setError("")
    if (!file) { setError("Choose a .xlsx or .csv file first."); return }
    if (!/\.(xlsx|csv)$/i.test(file.name)) { setError("Choose a .xlsx or .csv file."); return }
    if (/\.xlsx$/i.test(file.name)) { setError("Excel workbooks can’t be read here. Save the sheet as a .csv file and choose that."); return }
    setBusy(true)
    try {
      const parsed = mode === "preview" ? readImportLines(await readFileText(file)) : lines
      const outcome = await submitStudentImport(parsed, mode)
      setLines(parsed)
      setResults(outcome.results)
      if (mode === "commit") {
        await client.invalidateQueries({ queryKey: ["department-head"] })
        notify(`Imported ${outcome.imported} student${outcome.imported === 1 ? "" : "s"}.`)
      }
    } catch (failure) {
      setResults(null)
      setError(failure instanceof Error ? failure.message : "The file could not be checked.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import spreadsheet</DialogTitle>
          <DialogDescription>Select a .csv file with the columns {IMPORT_COLUMNS.join(", ")}. Rows are checked before anything is added.</DialogDescription>
        </DialogHeader>
        <FormField label="Student spreadsheet" htmlFor="student-import-file" error={error}>
          <Input id="student-import-file" type="file" accept=".xlsx,.csv" aria-invalid={!!error}
            onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); setResults(null) }} />
        </FormField>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void run("preview")}>Check file</Button>
        {results && <section aria-label="Validation results">
          <p className="mb-3 text-sm font-semibold">
            {imported ? `${results.length} imported` : `${results.length - errors} valid · ${errors} with errors`}
          </p>
          <Table responsive><TableHeader><TableRow>{["Row", "Student ID", "Result", "Details"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{results.map((row) => <TableRow key={row.line.rowNumber}>
              <TableCell label="Row">{row.line.rowNumber}</TableCell>
              <TableCell label="Student ID" className="font-mono">{row.line.student_number || "—"}</TableCell>
              <TableCell label="Result"><Badge variant={row.outcome === "error" ? "destructive" : "secondary"} className="rounded-sm">{LABELS[row.outcome]}</Badge></TableCell>
              <TableCell label="Details" className="whitespace-normal"><span className="min-w-0">{row.message}</span></TableCell>
            </TableRow>)}</TableBody>
          </Table>
          {errors > 0 && <Alert variant="advisory" className="mt-3"><AlertDescription>Fix the rows with errors in the file, then check it again. Nothing is imported until every row is valid.</AlertDescription></Alert>}
        </section>}
        <DialogFooter>
          {results && errors === 0 && !imported && <Button type="button" disabled={busy} onClick={() => void run("commit")}>Import {results.length} student{results.length === 1 ? "" : "s"}</Button>}
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
