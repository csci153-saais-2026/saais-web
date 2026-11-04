import { ChevronDownIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Kicker } from "@/components/ui/kicker"
import { StatusBadge, type Status } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type ChecklistRow = {
  code: string
  title: string
  unitsEarned: number
  unitsRequired: number
  status: Status
  source: string
  sourceDetail?: string
  attempts: number
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <Kicker className="block text-[10.5px]">{label}</Kicker>
      <div className="font-heading text-lg font-bold text-primary">{value}</div>
    </div>
  )
}

/** One collapsible semester block of the curriculum checklist, with its summary figures. */
function ChecklistTermGroup({
  title,
  description,
  passedUnits,
  totalUnits,
  semesterGwa,
  rows,
  onCourseInfo,
  open,
  onOpenChange,
}: {
  title: string
  description?: string
  passedUnits: number
  totalUnits: number
  semesterGwa?: string
  rows: ChecklistRow[]
  onCourseInfo?: (code: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={open === undefined ? true : undefined}
      className="mb-4 overflow-hidden rounded-md border border-border bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-4 bg-secondary px-5 py-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          {description && <span className="block text-sm text-muted-foreground">{description}</span>}
        </span>
        <Summary label="Passed units" value={`${passedUnits}/${totalUnits}`} />
        <Summary label="Total units" value={String(totalUnits)} />
        {semesterGwa && <Summary label="Semester GWA" value={semesterGwa} />}
        <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              {["Requirement", "Units earned / required", "Status", "Satisfaction source", "Attempts", "Course info"].map(
                (h) => (
                  <TableHead key={h} className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                    {h}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell>
                  <b className="block font-semibold">{r.code}</b>
                  <span className="text-xs text-muted-foreground">{r.title}</span>
                </TableCell>
                <TableCell>
                  {r.unitsEarned} / {r.unitsRequired}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  <span className="block">{r.source}</span>
                  {r.sourceDetail && <span className="text-xs text-muted-foreground">{r.sourceDetail}</span>}
                </TableCell>
                <TableCell>
                  {r.attempts} {r.attempts === 1 ? "attempt" : "attempts"}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => onCourseInfo?.(r.code)}>
                    Course info
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CollapsibleContent>
    </Collapsible>
  )
}

export { ChecklistTermGroup }
