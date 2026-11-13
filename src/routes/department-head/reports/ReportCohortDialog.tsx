import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCohortStudents, type CohortSummary } from "./reports-data"

export function ReportCohortDialog({ cohort, onClose }: { cohort: CohortSummary | null; onClose: () => void }) {
  const students = cohort ? getCohortStudents(cohort) : []
  return (
    <Dialog open={cohort !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Batch {cohort?.entryYear} · Student GWA</DialogTitle>
          <DialogDescription>
            {cohort?.students} fictional students · {cohort?.program.toUpperCase()} · {cohort?.curriculum}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="rounded-sm">Sample data</Badge>
          <span>Study range: {cohort?.entryYear}–{cohort ? cohort.entryYear + 4 : ""}</span>
        </div>
        <div className="max-h-[50dvh] overflow-y-auto rounded-md border border-border">
          <Table responsive aria-label="Cohort student GWA">
            <TableHeader className="sticky top-0 bg-secondary">
              <TableRow><TableHead>Student</TableHead><TableHead>Student ID</TableHead><TableHead>Curriculum</TableHead><TableHead className="text-right">GWA</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell label="Student" className="whitespace-normal">{student.name}</TableCell>
                  <TableCell label="Student ID" className="font-mono text-xs">{student.studentNumber}</TableCell>
                  <TableCell label="Curriculum">{student.curriculum}</TableCell>
                  <TableCell label="GWA" className="text-right font-mono">{student.gwa}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">These generated examples illustrate a cohort drill-down. Their grades are not the input to the report’s summary GWA.</p>
        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close preview</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
