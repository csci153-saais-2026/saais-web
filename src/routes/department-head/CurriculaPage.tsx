import * as React from "react"
import { PlusIcon } from "@/components/icons"
import { FormField } from "@/components/features/form-field"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { SampleFooter } from "@/components/features/sample-footer"
import { StatGrid } from "@/components/features/stat-tile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DepartmentToast } from "@/routes/department-head/dh-ui"
import {
  formatDisplayDate,
  useDepartmentToast,
} from "@/routes/department-head/dh-utils"
import {
  CURRICULUM_SEMESTERS,
  FACULTY_DEPARTMENTS,
  MOCK_CURRICULA_VERSIONS,
  type CurriculumCourseSlot,
  type CurriculumSemester,
  type CurriculumSlotType,
  type CurriculumTermBlock,
  type CurriculumVersionRecord,
  type CurriculumVersionStatus,
} from "@/routes/department-head/mock-data"

type CurriculaDialogState =
  | { kind: "add-version" }
  | { kind: "edit-version"; versionId: string }
  | { kind: "del-version"; versionId: string }
  | { kind: "add-term" }
  | { kind: "edit-term"; termId: string }
  | { kind: "del-term"; termId: string }
  | { kind: "new-course" }
  | { kind: "add-slot"; termId: string }
  | { kind: "edit-slot"; termId: string; slotId: string }
  | { kind: "del-slot"; termId: string; slotId: string }
  | null

const YEAR_LEVELS = ["1", "2", "3", "4", "5"] as const
const TERM_OPTIONS = [1, 2, 3, 4, 5].flatMap((y) =>
  CURRICULUM_SEMESTERS.map((sem) => `Year ${y} · ${sem}`)
)
const FACULTY_LIST = Object.keys(FACULTY_DEPARTMENTS)
const SLOT_TYPES: CurriculumSlotType[] = [
  "Required course",
  "Elective slot",
  "GE slot",
]

function versionLabel(v: CurriculumVersionRecord) {
  return `${v.prog} · ${v.year}`
}

function sortTerms(terms: CurriculumTermBlock[]) {
  return [...terms].sort(
    (a, b) =>
      a.year - b.year ||
      CURRICULUM_SEMESTERS.indexOf(a.sem) - CURRICULUM_SEMESTERS.indexOf(b.sem)
  )
}

export default function CurriculaPage() {
  const [versions, setVersions] = React.useState<CurriculumVersionRecord[]>(
    MOCK_CURRICULA_VERSIONS
  )
  const [selectedVersionId, setSelectedVersionId] = React.useState<string>(
    MOCK_CURRICULA_VERSIONS[0]?.id ?? ""
  )
  const [dialog, setDialog] = React.useState<CurriculaDialogState>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  // Version form state
  const [vProg, setVProg] = React.useState<"BSCS" | "BSIT">("BSCS")
  const [vYear, setVYear] = React.useState("")
  const [vUnits, setVUnits] = React.useState("147")
  const [vFrom, setVFrom] = React.useState("")
  const [vStatus, setVStatus] = React.useState<CurriculumVersionStatus>("draft")

  // Term form state
  const [tYear, setTYear] = React.useState("1")
  const [tSem, setTSem] = React.useState<CurriculumSemester>("Semester 1")

  // Slot form state
  const [sName, setSName] = React.useState("")
  const [sUnits, setSUnits] = React.useState("3")
  const [sType, setSType] = React.useState<CurriculumSlotType>("Required course")

  // New course form state
  const [ncCode, setNcCode] = React.useState("")
  const [ncTitle, setNcTitle] = React.useState("")
  const [ncUnits, setNcUnits] = React.useState("3")
  const [ncFac, setNcFac] = React.useState(FACULTY_LIST[0])
  const [ncDep, setNcDep] = React.useState(FACULTY_DEPARTMENTS[FACULTY_LIST[0]][0])
  const [ncCurId, setNcCurId] = React.useState(MOCK_CURRICULA_VERSIONS[0]?.id ?? "")
  const [ncTerm, setNcTerm] = React.useState(TERM_OPTIONS[0])
  const [ncKind, setNcKind] = React.useState<"Non-Elective" | "Elective">("Non-Elective")

  const { message: toastMessage, showToast } = useDepartmentToast(5000)

  const currentVersion =
    versions.find((v) => v.id === selectedVersionId) ?? versions[0] ?? null

  const closeDialog = () => {
    setDialog(null)
    setFormError(null)
  }

  const openAddVersion = () => {
    setVProg("BSCS")
    setVYear("")
    setVUnits("147")
    setVFrom("")
    setVStatus("draft")
    setFormError(null)
    setDialog({ kind: "add-version" })
  }

  const openEditVersion = () => {
    if (!currentVersion) return
    setVProg(currentVersion.prog)
    setVYear(currentVersion.year)
    setVUnits(String(currentVersion.units))
    setVFrom(currentVersion.from)
    setVStatus(currentVersion.status)
    setFormError(null)
    setDialog({ kind: "edit-version", versionId: currentVersion.id })
  }

  const openAddTerm = () => {
    if (!currentVersion) return
    setTYear("1")
    setTSem("Semester 1")
    setFormError(null)
    setDialog({ kind: "add-term" })
  }

  const openEditTerm = (term: CurriculumTermBlock) => {
    setTYear(String(term.year))
    setTSem(term.sem)
    setFormError(null)
    setDialog({ kind: "edit-term", termId: term.id })
  }

  const openNewCourse = () => {
    if (!currentVersion) return
    const defaultFac = FACULTY_LIST[0]
    setNcCode("")
    setNcTitle("")
    setNcUnits("3")
    setNcFac(defaultFac)
    setNcDep(FACULTY_DEPARTMENTS[defaultFac][0])
    setNcCurId(currentVersion.id)
    setNcTerm(TERM_OPTIONS[0])
    setNcKind("Non-Elective")
    setFormError(null)
    setDialog({ kind: "new-course" })
  }

  const openAddSlot = (termId: string) => {
    setSName("")
    setSUnits("3")
    setSType("Required course")
    setFormError(null)
    setDialog({ kind: "add-slot", termId })
  }

  const openEditSlot = (termId: string, slot: CurriculumCourseSlot) => {
    setSName(slot.courseOrSlot)
    setSUnits(String(slot.requiredUnits))
    setSType(slot.type)
    setFormError(null)
    setDialog({ kind: "edit-slot", termId, slotId: slot.id })
  }

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dialog) return

    if (dialog.kind === "add-version" || dialog.kind === "edit-version") {
      const year = vYear.trim()
      const units = Number(vUnits)
      if (!year) {
        setFormError("Enter the academic year, for example 2023–2024.")
        return
      }
      if (!Number.isFinite(units) || units <= 0) {
        setFormError("Required units must be a positive number.")
        return
      }
      if (!vFrom) {
        setFormError("Choose the date this version takes effect.")
        return
      }
      const duplicate = versions.some(
        (v) =>
          (dialog.kind === "add-version" || v.id !== dialog.versionId) &&
          v.prog === vProg &&
          v.year === year
      )
      if (duplicate) {
        setFormError(`${vProg} · ${year} already exists.`)
        return
      }

      if (dialog.kind === "edit-version") {
        setVersions((prev) =>
          prev.map((v) =>
            v.id === dialog.versionId
              ? { ...v, prog: vProg, year, units, from: vFrom, status: vStatus }
              : v
          )
        )
      } else {
        const nextId = `ver-${Date.now()}`
        const created: CurriculumVersionRecord = {
          id: nextId,
          prog: vProg,
          year,
          units,
          enrolled: 0,
          from: vFrom,
          status: vStatus,
          terms: [],
        }
        setVersions((prev) => [...prev, created])
        setSelectedVersionId(nextId)
      }
      showToast(`${vProg} · ${year} was saved.`)
      closeDialog()
      return
    }

    if (dialog.kind === "del-version") {
      const target = versions.find((v) => v.id === dialog.versionId)
      const remaining = versions.filter((v) => v.id !== dialog.versionId)
      setVersions(remaining)
      setSelectedVersionId(remaining[0]?.id ?? "")
      showToast(`${target ? versionLabel(target) : "Version"} was deleted.`)
      closeDialog()
      return
    }

    if (!currentVersion) return

    if (dialog.kind === "add-term" || dialog.kind === "edit-term") {
      const yearNum = Number(tYear)
      const duplicate = currentVersion.terms.some(
        (t) =>
          (dialog.kind === "add-term" || t.id !== dialog.termId) &&
          t.year === yearNum &&
          t.sem === tSem
      )
      if (duplicate) {
        setFormError(`Year ${yearNum} · ${tSem} already exists in this version.`)
        return
      }

      setVersions((prev) =>
        prev.map((v) => {
          if (v.id !== currentVersion.id) return v
          const nextTerms =
            dialog.kind === "edit-term"
              ? v.terms.map((t) =>
                  t.id === dialog.termId ? { ...t, year: yearNum, sem: tSem } : t
                )
              : [
                  ...v.terms,
                  { id: `term-${Date.now()}`, year: yearNum, sem: tSem, rows: [] },
                ]
          return { ...v, terms: sortTerms(nextTerms) }
        })
      )
      showToast(`Year ${yearNum} · ${tSem} was saved.`)
      closeDialog()
      return
    }

    if (dialog.kind === "del-term") {
      setVersions((prev) =>
        prev.map((v) =>
          v.id === currentVersion.id
            ? { ...v, terms: v.terms.filter((t) => t.id !== dialog.termId) }
            : v
        )
      )
      showToast("The term was deleted.")
      closeDialog()
      return
    }

    if (dialog.kind === "new-course") {
      const code = ncCode.trim()
      const title = ncTitle.trim()
      const unitsNum = Number(ncUnits)
      if (!code) {
        setFormError("Enter the course code, for example CSIT 100.")
        return
      }
      if (!title) {
        setFormError("Enter the course title.")
        return
      }
      if (ncUnits.trim() === "" || !Number.isFinite(unitsNum) || unitsNum < 0) {
        setFormError("Units must be zero or more.")
        return
      }
      const codeTaken = versions.some((v) =>
        v.terms.some((t) =>
          t.rows.some((r) =>
            r.courseOrSlot.toLowerCase().startsWith(`${code.toLowerCase()} —`)
          )
        )
      )
      if (codeTaken) {
        setFormError(`${code} already exists. Course codes must be unique.`)
        return
      }

      const targetVersion = versions.find((v) => v.id === ncCurId) ?? currentVersion
      const match = /^Year (\d) · (.+)$/.exec(ncTerm)
      const parsedYear = match ? Number(match[1]) : 1
      const parsedSem = (match?.[2] ?? "Semester 1") as CurriculumSemester
      const slotName = `${code} — ${title}`
      const slotType: CurriculumSlotType =
        ncKind === "Elective" ? "Elective slot" : "Required course"

      setVersions((prev) =>
        prev.map((v) => {
          if (v.id !== targetVersion.id) return v
          const existingTerm = v.terms.find(
            (t) => t.year === parsedYear && t.sem === parsedSem
          )
          const newSlot: CurriculumCourseSlot = {
            id: `slot-${Date.now()}`,
            courseOrSlot: slotName,
            requiredUnits: unitsNum,
            type: slotType,
          }
          const nextTerms = existingTerm
            ? v.terms.map((t) =>
                t.id === existingTerm.id
                  ? {
                      ...t,
                      rows: t.rows.some((r) => r.courseOrSlot === slotName)
                        ? t.rows
                        : [...t.rows, newSlot],
                    }
                  : t
              )
            : sortTerms([
                ...v.terms,
                {
                  id: `term-${Date.now()}`,
                  year: parsedYear,
                  sem: parsedSem,
                  rows: [newSlot],
                },
              ])
          return { ...v, terms: nextTerms }
        })
      )
      setSelectedVersionId(targetVersion.id)
      showToast(
        `${code} was added to ${versionLabel(targetVersion)}, ${ncTerm}.`
      )
      closeDialog()
      return
    }

    if (dialog.kind === "add-slot" || dialog.kind === "edit-slot") {
      const name = sName.trim()
      const unitsNum = Number(sUnits)
      if (!name) {
        setFormError("Enter the course or slot name.")
        return
      }
      if (sUnits.trim() === "" || !Number.isFinite(unitsNum) || unitsNum < 0) {
        setFormError("Required units must be zero or more.")
        return
      }

      setVersions((prev) =>
        prev.map((v) => {
          if (v.id !== currentVersion.id) return v
          return {
            ...v,
            terms: v.terms.map((t) => {
              if (t.id !== dialog.termId) return t
              if (dialog.kind === "edit-slot") {
                return {
                  ...t,
                  rows: t.rows.map((r) =>
                    r.id === dialog.slotId
                      ? { ...r, courseOrSlot: name, requiredUnits: unitsNum, type: sType }
                      : r
                  ),
                }
              }
              return {
                ...t,
                rows: [
                  ...t.rows,
                  {
                    id: `slot-${Date.now()}`,
                    courseOrSlot: name,
                    requiredUnits: unitsNum,
                    type: sType,
                  },
                ],
              }
            }),
          }
        })
      )
      showToast(`${name} was saved.`)
      closeDialog()
      return
    }

    if (dialog.kind === "del-slot") {
      setVersions((prev) =>
        prev.map((v) => {
          if (v.id !== currentVersion.id) return v
          return {
            ...v,
            terms: v.terms.map((t) =>
              t.id === dialog.termId
                ? { ...t, rows: t.rows.filter((r) => r.id !== dialog.slotId) }
                : t
            ),
          }
        })
      )
      showToast("The course was removed.")
      closeDialog()
    }
  }

  const dialogMeta = (() => {
    if (!dialog) return { title: "", confirmLabel: "", isDelete: false }
    switch (dialog.kind) {
      case "add-version":
        return { title: "Add version", confirmLabel: "Add version", isDelete: false }
      case "edit-version":
        return { title: "Edit version", confirmLabel: "Save changes", isDelete: false }
      case "del-version":
        return { title: "Delete record", confirmLabel: "Delete", isDelete: true }
      case "add-term":
        return { title: "Add term", confirmLabel: "Add term", isDelete: false }
      case "edit-term":
        return { title: "Edit term", confirmLabel: "Save changes", isDelete: false }
      case "del-term":
        return { title: "Delete record", confirmLabel: "Delete", isDelete: true }
      case "new-course":
        return { title: "New course", confirmLabel: "Add course", isDelete: false }
      case "add-slot":
        return { title: "Add course / slot", confirmLabel: "Add", isDelete: false }
      case "edit-slot":
        return { title: "Edit course / slot", confirmLabel: "Save changes", isDelete: false }
      case "del-slot":
        return { title: "Delete record", confirmLabel: "Delete", isDelete: true }
    }
  })()

  const deleteTargetVersion =
    dialog?.kind === "del-version"
      ? versions.find((v) => v.id === dialog.versionId)
      : null
  const deleteTargetTerm =
    dialog?.kind === "del-term" || dialog?.kind === "del-slot"
      ? currentVersion?.terms.find((t) => t.id === dialog.termId)
      : null
  const deleteTargetSlot =
    dialog?.kind === "del-slot"
      ? deleteTargetTerm?.rows.find((r) => r.id === dialog.slotId)
      : null

  return (
    <div className="space-y-6">
      <PageHeading
        title="Shape the path to graduation."
        subtitle="Versioned requirements keep past and present curricula distinct."
        actions={
          <Button onClick={openAddVersion}>
            <PlusIcon /> Add version
          </Button>
        }
      />

      {/* Version selector and curriculum builder toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <FormField
          label="Curriculum version"
          htmlFor="cu-version"
          className="w-full sm:w-[280px] sm:min-w-[220px]"
        >
          <Select
            value={currentVersion?.id ?? ""}
            onValueChange={setSelectedVersionId}
            disabled={!currentVersion}
          >
            <SelectTrigger id="cu-version" className="w-full bg-card">
              <SelectValue placeholder="No versions" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {versionLabel(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <Button
          type="button"
          variant="outline"
          disabled={!currentVersion}
          onClick={openEditVersion}
        >
          Edit version
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!currentVersion}
          onClick={() =>
            currentVersion &&
            setDialog({ kind: "del-version", versionId: currentVersion.id })
          }
        >
          Delete version
        </Button>

        <div className="hidden sm:block sm:flex-1" />

        <Button
          type="button"
          variant="outline"
          disabled={!currentVersion}
          onClick={openAddTerm}
        >
          Add term
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!currentVersion}
          onClick={openNewCourse}
        >
          New course
        </Button>
      </div>

      {!currentVersion ? (
        <div className="rounded-md border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          No curriculum versions yet. Use Add version to create one.
        </div>
      ) : (
        <>
          <StatGrid
            className="[&_.font-heading]:text-[30px]"
            items={[
              {
                label: "Required units",
                value: currentVersion.units,
                note: "Full degree requirement",
              },
              {
                label: "Enrolled students",
                value: currentVersion.enrolled,
                note: "Students on this curriculum",
              },
              {
                label: "Effective from",
                value: formatDisplayDate(currentVersion.from, { padDay: false }),
                note: "Version effectivity",
              },
              {
                label: "Status",
                value: currentVersion.status,
                note: "Curriculum lifecycle",
              },
            ]}
          />

          {currentVersion.terms.length === 0 ? (
            <div className="rounded-md border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
              This version has no terms yet. Use Add term to start.
            </div>
          ) : (
            <div className="space-y-5">
              {currentVersion.terms.map((term) => (
                <Panel
                  key={term.id}
                  title={`Year ${term.year} · ${term.sem}`}
                  description="Positional curriculum term; not a calendar school term."
                  flush
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openAddSlot(term.id)}
                      >
                        Add course / slot
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditTerm(term)}
                      >
                        Edit term
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDialog({ kind: "del-term", termId: term.id })
                        }
                      >
                        Delete term
                      </Button>
                    </div>
                  }
                >
                  <Table responsive>
                    <TableHeader className="bg-secondary">
                      <TableRow>
                        <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                          Course / slot
                        </TableHead>
                        <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                          Required units
                        </TableHead>
                        <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                          Type
                        </TableHead>
                        <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {term.rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-6 text-center text-muted-foreground"
                          >
                            No courses in this term yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        term.rows.map((slot) => (
                          <TableRow key={slot.id}>
                            <TableCell label="Course / slot" className="font-medium text-foreground">
                              {slot.courseOrSlot}
                            </TableCell>
                            <TableCell label="Required units" className="font-mono text-sm">
                              {slot.requiredUnits}
                            </TableCell>
                            <TableCell label="Type" className="text-muted-foreground">
                              {slot.type}
                            </TableCell>
                            <TableCell label="Actions">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditSlot(term.id, slot)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setDialog({
                                      kind: "del-slot",
                                      termId: term.id,
                                      slotId: slot.id,
                                    })
                                  }
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Panel>
              ))}
            </div>
          )}
        </>
      )}

      {/* Curriculum Builder Dialog */}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMeta.title}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirm} className="space-y-4">
            {(dialog?.kind === "add-version" || dialog?.kind === "edit-version") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Program" htmlFor="cu-prog">
                  <Select
                    value={vProg}
                    onValueChange={(val) => setVProg(val as "BSCS" | "BSIT")}
                  >
                    <SelectTrigger id="cu-prog" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BSCS">BSCS</SelectItem>
                      <SelectItem value="BSIT">BSIT</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Academic year" htmlFor="cu-year">
                  <Input
                    id="cu-year"
                    value={vYear}
                    placeholder="2023–2024"
                    onChange={(e) => setVYear(e.target.value)}
                  />
                </FormField>

                <FormField label="Required units" htmlFor="cu-units">
                  <Input
                    id="cu-units"
                    value={vUnits}
                    onChange={(e) => setVUnits(e.target.value)}
                  />
                </FormField>

                <FormField label="Effective from" htmlFor="cu-from">
                  <Input
                    id="cu-from"
                    type="date"
                    value={vFrom}
                    onChange={(e) => setVFrom(e.target.value)}
                  />
                </FormField>

                <FormField label="Status" htmlFor="cu-status">
                  <Select
                    value={vStatus}
                    onValueChange={(val) =>
                      setVStatus(val as CurriculumVersionStatus)
                    }
                  >
                    <SelectTrigger id="cu-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="draft">draft</SelectItem>
                      <SelectItem value="retired">retired</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

            {dialog?.kind === "del-version" && deleteTargetVersion && (
              <p className="text-sm text-foreground">
                Delete{" "}
                <strong className="font-semibold">
                  {versionLabel(deleteTargetVersion)}
                </strong>{" "}
                and all of its terms? This can’t be undone.
              </p>
            )}

            {(dialog?.kind === "add-term" || dialog?.kind === "edit-term") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Year level" htmlFor="cu-tyear">
                  <Select value={tYear} onValueChange={setTYear}>
                    <SelectTrigger id="cu-tyear" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVELS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Term" htmlFor="cu-tsem">
                  <Select
                    value={tSem}
                    onValueChange={(val) => setTSem(val as CurriculumSemester)}
                  >
                    <SelectTrigger id="cu-tsem" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRICULUM_SEMESTERS.map((sem) => (
                        <SelectItem key={sem} value={sem}>
                          {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

            {dialog?.kind === "del-term" && deleteTargetTerm && (
              <p className="text-sm text-foreground">
                Delete{" "}
                <strong className="font-semibold">
                  Year {deleteTargetTerm.year} · {deleteTargetTerm.sem}
                </strong>{" "}
                and its {deleteTargetTerm.rows.length} course(s)?
              </p>
            )}

            {dialog?.kind === "new-course" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Course code" htmlFor="nc-code">
                  <Input
                    id="nc-code"
                    value={ncCode}
                    onChange={(e) => setNcCode(e.target.value)}
                  />
                </FormField>

                <FormField label="Course title" htmlFor="nc-title">
                  <Input
                    id="nc-title"
                    value={ncTitle}
                    onChange={(e) => setNcTitle(e.target.value)}
                  />
                </FormField>

                <FormField label="Units" htmlFor="nc-units">
                  <Input
                    id="nc-units"
                    value={ncUnits}
                    onChange={(e) => setNcUnits(e.target.value)}
                  />
                </FormField>

                <FormField label="Faculty" htmlFor="nc-fac">
                  <Select
                    value={ncFac}
                    onValueChange={(fac) => {
                      setNcFac(fac)
                      setNcDep(FACULTY_DEPARTMENTS[fac]?.[0] ?? "")
                    }}
                  >
                    <SelectTrigger id="nc-fac" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FACULTY_LIST.map((fac) => (
                        <SelectItem key={fac} value={fac}>
                          {fac}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Department" htmlFor="nc-dep">
                  <Select value={ncDep} onValueChange={setNcDep}>
                    <SelectTrigger id="nc-dep" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(FACULTY_DEPARTMENTS[ncFac] ?? []).map((dep) => (
                        <SelectItem key={dep} value={dep}>
                          {dep}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Curriculum" htmlFor="nc-cur">
                  <Select value={ncCurId} onValueChange={setNcCurId}>
                    <SelectTrigger id="nc-cur" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {versionLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Term" htmlFor="nc-term">
                  <Select value={ncTerm} onValueChange={setNcTerm}>
                    <SelectTrigger id="nc-term" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERM_OPTIONS.map((tOpt) => (
                        <SelectItem key={tOpt} value={tOpt}>
                          {tOpt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Course type" htmlFor="nc-kind">
                  <Select
                    value={ncKind}
                    onValueChange={(val) =>
                      setNcKind(val as "Non-Elective" | "Elective")
                    }
                  >
                    <SelectTrigger id="nc-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Non-Elective">Non-Elective</SelectItem>
                      <SelectItem value="Elective">Elective</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

            {(dialog?.kind === "add-slot" || dialog?.kind === "edit-slot") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Course / slot"
                  htmlFor="cu-sname"
                  className="sm:col-span-2"
                >
                  <Input
                    id="cu-sname"
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                  />
                </FormField>

                <FormField label="Required units" htmlFor="cu-sunits">
                  <Input
                    id="cu-sunits"
                    value={sUnits}
                    onChange={(e) => setSUnits(e.target.value)}
                  />
                </FormField>

                <FormField label="Type" htmlFor="cu-stype">
                  <Select
                    value={sType}
                    onValueChange={(val) => setSType(val as CurriculumSlotType)}
                  >
                    <SelectTrigger id="cu-stype" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_TYPES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

            {dialog?.kind === "del-slot" && deleteTargetTerm && deleteTargetSlot && (
              <p className="text-sm text-foreground">
                Delete{" "}
                <strong className="font-semibold">
                  {deleteTargetSlot.courseOrSlot}
                </strong>{" "}
                from Year {deleteTargetTerm.year} · {deleteTargetTerm.sem}?
              </p>
            )}

            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={dialogMeta.isDelete ? "destructive" : "default"}
              >
                {dialogMeta.confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DepartmentToast message={toastMessage} />

      <SampleFooter>
        Sample records for presentation · Reference date: 15 August 2025 · Static design
      </SampleFooter>
    </div>
  )
}
