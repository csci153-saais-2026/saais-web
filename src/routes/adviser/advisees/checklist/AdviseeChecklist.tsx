import { AdviserPage, StaticSelect } from "../../Adviser"
import { checklistTerms, courseInfo, adviseeChecklistMetrics } from "@/mocks/adviser.mock"
import { StatGrid } from "@/components/features/stat-tile"
import { DataTablePanel } from "@/components/features/data-table-panel"
import type { ChecklistRow } from "@/components/features/checklist-term-group"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { ChevronDownIcon } from "@/components/icons"

function CourseInfo({ row }: { row: ChecklistRow }) {
  const info = courseInfo[row.code]
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm">Course info</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogDescription>{info.meta}</DialogDescription>
        </DialogHeader>
        <div><StatusBadge status={row.status} /></div>
        {info.rows.length ? (
          <Table responsive>
            <TableHeader className="bg-secondary">
              <TableRow>{["Term", "Midterm", "Final", "Completion", "Instructor"].map(label => <TableHead key={label}>{label}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {info.rows.map((attempt, index) => (
                <TableRow key={index}>
                  {attempt.map((value, column) => <TableCell key={column} label={["Term", "Midterm", "Final", "Completion", "Instructor"][column]}>{value}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">Not yet taken</p>}
        <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdviseeChecklist() {
  return (
    <AdviserPage title="Checklist" tab="checklist">
      <StatGrid items={adviseeChecklistMetrics} />
      <div className="mb-5 flex items-end justify-between gap-4">
        <StaticSelect id="requirements" label="Show requirements" value="All statuses" options={["All statuses", "Not yet taken", "Passed / credited", "INC", "Currently enrolled"]} className="w-56" />
        <Button variant="outline">Collapse all</Button>
      </div>
      {checklistTerms.map(term => (
        <DataTablePanel
          key={term.title}
          title={term.title}
          description="Curriculum position · course availability depends on the school term."
          action={<ChevronDownIcon className="size-4 text-muted-foreground" />}
          rows={term.rows}
          rowKey={row => row.code}
          columns={[
            { header: "Requirement", cell: row => <><b className="block">{row.code}</b><span className="text-xs text-muted-foreground">{row.title}</span></> },
            { header: "Units earned / required", cell: row => `${row.unitsEarned} / ${row.unitsRequired}` },
            { header: "Status", cell: row => <StatusBadge status={row.status} /> },
            { header: "Satisfaction source", cell: row => <>{row.source}<span className="block text-xs text-muted-foreground">{row.sourceDetail}</span></> },
            { header: "Attempts", cell: row => row.attempts ? `${row.attempts} ${row.attempts === 1 ? "attempt" : "attempts"}` : "—" },
            { header: "Course info", cell: row => <CourseInfo row={row} /> },
          ]}
        />
      ))}
    </AdviserPage>
  )
}
