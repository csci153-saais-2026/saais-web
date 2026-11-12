import { Link } from "react-router"
import { AdviserPage, StaticSelect } from "../../Adviser"
import { gradeOptions, gradeTerms } from "@/mocks/adviser.mock"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { ChevronDownIcon, LockIcon, PencilIcon } from "@/components/icons"

type GradeRow = (typeof gradeTerms)[number]["rows"][number]

/** Dialog contents are static; shared primitives only manage opening and closing. */
function GradeAction({ row, locked }: { row: GradeRow; locked: boolean }) {
  const incomplete = row.status === "inc"
  const showLocked = locked && !incomplete
  const fieldId = `grade-${row.code.replaceAll(" ", "-")}`
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{incomplete ? "Resolve INC" : "Correct grade"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {showLocked ? "This school term is locked" : incomplete ? "Resolve incomplete grade" : "Correct grade"}
          </DialogTitle>
          <DialogDescription>
            {showLocked
              ? "Grade and status corrections are blocked. INC completion remains available before its deadline."
              : `${row.code} · ${row.title}`}
          </DialogDescription>
        </DialogHeader>
        {showLocked ? (
          <p className="text-sm text-muted-foreground">
            2024 - 2025 · 2nd Semester was locked by Teresa Alvarez on 1 Jun 2026.
            Ask the registrar to reopen the term if a correction is required.
          </p>
        ) : (
          <>
            {!incomplete && (
              <StaticSelect id={`${fieldId}-midterm`} label="Midterm grade" value="Select grade" options={gradeOptions} />
            )}
            <StaticSelect
              id={`${fieldId}-final`}
              label={incomplete ? "Completion grade" : "Final grade"}
              value="Select grade"
              options={gradeOptions}
            />
            <FormField htmlFor={`${fieldId}-reason`} label={incomplete ? "Reason" : "Reason for change"}>
              <Textarea id={`${fieldId}-reason`} value="" readOnly rows={3} />
            </FormField>
          </>
        )}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{showLocked ? "Close" : "Cancel"}</Button></DialogClose>
          {!showLocked && <Button type="button">Save grade</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdviseeGradesPage() {
  return (
    <AdviserPage title="Grades" tab="grades">
      <div className="mb-4 flex justify-end gap-3">
        <Button variant="outline">Collapse all</Button>
        <Button asChild><Link to="/adviser/encode-grades"><PencilIcon />Encode grades</Link></Button>
      </div>
      {gradeTerms.map((term, index) => (
        <DataTablePanel
          key={term.title}
          title={term.title}
          description={term.description}
          action={<span className="flex items-center gap-3 text-muted-foreground">{index === 1 && <LockIcon className="size-4" />}<ChevronDownIcon className="size-4" /></span>}
          rows={term.rows}
          rowKey={row => row.code}
          columns={[
            { header: "Course", cell: row => <><b className="block">{row.code}</b><span className="text-xs text-muted-foreground">{row.title}</span></> },
            { header: "Units", numeric: true, cell: row => row.units },
            { header: "Midterm", numeric: true, cell: row => row.midterm },
            { header: "Final / completion", numeric: true, cell: row => row.final },
            { header: "Status", cell: row => <><StatusBadge status={row.status} />{row.status === "inc" && <span className="mt-1 block text-xs text-status-inc">Due 26 Oct 2026</span>}</> },
            { header: "Action", cell: row => <GradeAction row={row} locked={index === 1} /> },
          ]}
        />
      ))}
      <p className="text-sm text-muted-foreground">
        Once passed, the most recent passing attempt counts for non-repeatable and grade-replacement courses.
        Additional-credit passes count independently. Lapsed INC remains INC and counts as 5.00 for GWA and failed units.
      </p>
    </AdviserPage>
  )
}
