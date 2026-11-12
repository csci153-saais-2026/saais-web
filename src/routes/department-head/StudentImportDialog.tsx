import { useState } from "react"
import { FormField } from "@/components/features/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const examples = [
  { id: "25-1-00999", name: "Nico Reyes", status: "Valid", detail: "All example fields are present.", tone: "secondary" as const },
  { id: "INVALID-ID", name: "Lea Torres", status: "Invalid ID", detail: "Example ID does not follow YY-S-NNNNN.", tone: "destructive" as const },
  { id: "24-1-00124", name: "Ana Marie Santos", status: "Duplicate ID", detail: "Example ID already exists in the sample directory.", tone: "destructive" as const },
]

export function StudentImportDialog({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [showExamples, setShowExamples] = useState(false)

  function showPreview() {
    setShowExamples(false)
    if (!file) { setError("Choose a .xlsx or .csv file first."); return }
    if (!/\.(xlsx|csv)$/i.test(file.name)) { setError("Choose a .xlsx or .csv file."); return }
    setError("")
    setShowExamples(true)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Import spreadsheet</DialogTitle><DialogDescription>Select a .xlsx or .csv file to demonstrate the validation screen.</DialogDescription></DialogHeader>
        <Alert variant="advisory"><AlertDescription>Sample results only. The selected file is not uploaded or read, and no student records will be added.</AlertDescription></Alert>
        <FormField label="Student spreadsheet" htmlFor="student-import-file" error={error}>
          <Input id="student-import-file" type="file" accept=".xlsx,.csv" aria-invalid={!!error}
            onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); setShowExamples(false) }} />
        </FormField>
        <Button type="button" variant="outline" onClick={showPreview}>Show validation example</Button>
        {showExamples && <section aria-label="Sample validation results">
          <p className="mb-3 text-sm font-semibold">Illustrative results · 1 valid · 1 invalid ID · 1 duplicate ID</p>
          <Table responsive><TableHeader><TableRow>{["Student", "Student ID", "Result", "Details"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{examples.map((row) => <TableRow key={row.id}>
              <TableCell label="Student" className="whitespace-normal">{row.name}</TableCell>
              <TableCell label="Student ID" className="font-mono">{row.id}</TableCell>
              <TableCell label="Result"><Badge variant={row.tone} className="rounded-sm">{row.status}</Badge></TableCell>
              <TableCell label="Details" className="whitespace-normal"><span className="min-w-0">{row.detail}</span></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </section>}
        <DialogFooter><Button type="button" onClick={onClose}>Close preview</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
