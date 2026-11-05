import * as React from "react"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/icons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SampleFooter } from "@/components/features/sample-footer"
import {
  MOCK_CURRICULUM_VERSIONS,
  MOCK_OPENED_SUBJECTS,
  type CurriculumVersion,
} from "@/routes/department-head/mock-data"
import { cn } from "@/lib/utils"

export default function CurriculaPage() {
  const [curricula, setCurricula] = React.useState<CurriculumVersion[]>(MOCK_CURRICULUM_VERSIONS)
  const [selectedCurriculumCode, setSelectedCurriculumCode] = React.useState<string>("BSCS 2024")
  const [selectedYearStanding, setSelectedYearStanding] = React.useState<string>("All year levels")
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Dialog states
  const [isNewVersionOpen, setIsNewVersionOpen] = React.useState(false)
  const [isRenameOpen, setIsRenameOpen] = React.useState(false)
  const [renameTarget, setRenameTarget] = React.useState<CurriculumVersion | null>(null)
  const [renameNewName, setRenameNewName] = React.useState("")

  // New version form state
  const [newProgram, setNewProgram] = React.useState("BS Computer Science · DCST")
  const [newVersionName, setNewVersionName] = React.useState("BSCS 2026")
  const [newCopyFrom, setNewCopyFrom] = React.useState("BSCS 2024")
  const [newEffectiveAY, setNewEffectiveAY] = React.useState("2026–2027")

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4500)
  }

  const handleOpenRename = (version: CurriculumVersion) => {
    setRenameTarget(version)
    setRenameNewName(version.code)
    setIsRenameOpen(true)
  }

  const handleSaveRename = () => {
    if (!renameTarget || !renameNewName.trim()) return
    setCurricula((prev) =>
      prev.map((v) => (v.id === renameTarget.id ? { ...v, code: renameNewName.trim() } : v))
    )
    if (selectedCurriculumCode === renameTarget.code) {
      setSelectedCurriculumCode(renameNewName.trim())
    }
    setIsRenameOpen(false)
    showToast(`Curriculum renamed to ${renameNewName.trim()}. (Preview only)`)
  }

  const handleCreateVersion = () => {
    if (!newVersionName.trim()) return
    const newVersion: CurriculumVersion = {
      id: `ver-${Date.now()}`,
      code: newVersionName.trim(),
      program: newProgram.split("·")[0].trim(),
      department: "DCST",
      status: "Draft",
      isCurrent: false,
      enrolled: 0,
      effectiveYear: `Effective AY ${newEffectiveAY.trim()}`,
      requiredUnits: 147,
    }
    setCurricula((prev) => [...prev, newVersion])
    setIsNewVersionOpen(false)
    showToast(`New curriculum version ${newVersion.code} created. (Preview only)`)
  }

  // Filter opened subjects
  const filteredSubjects = React.useMemo(() => {
    if (selectedCurriculumCode !== "BSCS 2024") {
      return []
    }
    return MOCK_OPENED_SUBJECTS.filter((s) => {
      if (selectedYearStanding === "All year levels") return true
      return s.yearLevel === selectedYearStanding.split(" ")[0]
    })
  }, [selectedCurriculumCode, selectedYearStanding])

  const totalUnits = filteredSubjects.reduce((acc, s) => acc + s.units, 0)

  return (
    <div className="space-y-6">
      <PageHeading
        title="Curricula"
        subtitle="Manage curriculum versions and review subjects opened for the semester."
        actions={
          <Button onClick={() => setIsNewVersionOpen(true)} className="gap-2 cursor-pointer">
            <PlusIcon className="size-4" />
            New version
          </Button>
        }
      />

      {/* Version Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {curricula.map((ver) => {
          const isSelected = selectedCurriculumCode === ver.code
          return (
            <div
              key={ver.id}
              onClick={() => setSelectedCurriculumCode(ver.code)}
              className={cn(
                "group relative flex flex-col justify-between rounded-md border border-line bg-card p-5 transition-all cursor-pointer shadow-none",
                isSelected
                  ? "border-primary ring-1 ring-primary shadow-xs"
                  : "hover:border-primary/50",
                ver.isCurrent && "border-t-[3px] border-t-primary"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={ver.isCurrent ? "current" : "archived"}>
                    {ver.status}
                  </StatusBadge>
                  {isSelected && (
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                      Selected
                    </span>
                  )}
                </div>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  {ver.code}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{`${ver.program} · ${ver.department}`}</p>
                <div className="mt-5 mb-2 font-heading text-3xl font-bold text-primary">
                  {ver.enrolled}{" "}
                  <small className="font-sans text-xs font-normal text-muted-2">students enrolled</small>
                </div>
              </div>

              <footer className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-xs text-muted-2">
                <span>{ver.effectiveYear}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-primary font-medium hover:bg-secondary cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenRename(ver)
                  }}
                >
                  Rename
                </Button>
              </footer>
            </div>
          )
        })}
      </div>

      {/* Opened Subjects Panel */}
      <Panel
        title="Opened subjects"
        description={`AY 2025–2026 · 1st semester · ${selectedCurriculumCode}`}
        flush
      >
        <div className="flex flex-wrap items-center gap-4 border-b border-line-soft bg-card px-5 py-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="curr-select" className="text-xs font-semibold uppercase tracking-wider text-muted-2">
              Curriculum:
            </Label>
            <select
              id="curr-select"
              value={selectedCurriculumCode}
              onChange={(e) => setSelectedCurriculumCode(e.target.value)}
              className="h-8 rounded-sm border border-line bg-background px-2.5 text-xs text-foreground focus-visible:outline-primary"
            >
              {curricula.map((v) => (
                <option key={v.id} value={v.code}>
                  {v.code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="year-select" className="text-xs font-semibold uppercase tracking-wider text-muted-2">
              Year standing:
            </Label>
            <select
              id="year-select"
              value={selectedYearStanding}
              onChange={(e) => setSelectedYearStanding(e.target.value)}
              className="h-8 rounded-sm border border-line bg-background px-2.5 text-xs text-foreground focus-visible:outline-primary"
            >
              <option>All year levels</option>
              <option>1st year</option>
              <option>2nd year</option>
              <option>3rd year</option>
              <option>4th year</option>
            </select>
          </div>
        </div>

        <Table responsive>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="w-16 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Year</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Code / course subject</TableHead>
              <TableHead className="w-20 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Units</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Category</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Pre-requisites</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Co-requisites</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubjects.map((s) => (
              <TableRow key={s.id}>
                <TableCell label="Year" className="font-semibold text-muted-foreground">{s.yearLevel}</TableCell>
                <TableCell label="Code / course subject">
                  <strong className="block font-mono text-sm text-foreground">{s.code}</strong>
                  <small className="block text-xs text-muted-2">{s.title}</small>
                </TableCell>
                <TableCell label="Units" className="text-right font-mono font-medium">
                  {s.units}
                </TableCell>
                <TableCell label="Category" className="text-xs text-muted-foreground">{s.category}</TableCell>
                <TableCell label="Pre-requisites" className="text-xs text-muted-foreground">{s.prerequisites}</TableCell>
                <TableCell label="Co-requisites" className="text-xs text-muted-foreground">{s.corequisites}</TableCell>
              </TableRow>
            ))}
            {filteredSubjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  {selectedCurriculumCode !== "BSCS 2024"
                    ? `This static presentation preview contains opened subjects for BSCS 2024 only. Select BSCS 2024 to view the sample schedule.`
                    : "No subjects match the selected year standing."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex justify-between items-center border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
          <span>
            {filteredSubjects.length} opened subjects · {totalUnits} units
          </span>
          <span>DCST department scope</span>
        </div>
      </Panel>

      {/* New Version Dialog */}
      <Dialog open={isNewVersionOpen} onOpenChange={setIsNewVersionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New version of curriculum</DialogTitle>
            <DialogDescription>
              Create a new curriculum version for a degree program within your department.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="nv-prog">Degree program</Label>
              <select
                id="nv-prog"
                value={newProgram}
                onChange={(e) => setNewProgram(e.target.value)}
                className="w-full h-9 rounded-sm border border-line bg-background px-3 text-sm focus-visible:outline-primary"
              >
                <option>BS Computer Science · DCST</option>
                <option>BS Information Technology · DCST</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nv-name">Version name</Label>
              <Input
                id="nv-name"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                placeholder="e.g. BSCS 2026"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nv-copy">Copy from</Label>
              <select
                id="nv-copy"
                value={newCopyFrom}
                onChange={(e) => setNewCopyFrom(e.target.value)}
                className="w-full h-9 rounded-sm border border-line bg-background px-3 text-sm focus-visible:outline-primary"
              >
                <option>BSCS 2024</option>
                <option>BSCS 2021</option>
                <option>Start with an empty curriculum</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nv-ay">Effective academic year</Label>
              <Input
                id="nv-ay"
                value={newEffectiveAY}
                onChange={(e) => setNewEffectiveAY(e.target.value)}
                placeholder="2026–2027"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewVersionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVersion}>Create version</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename curriculum</DialogTitle>
            <DialogDescription>Change the public display identifier of this curriculum.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="rn-select">Curriculum</Label>
              <Input id="rn-select" value={renameTarget?.code ?? ""} disabled className="bg-muted text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rn-display">Display name</Label>
              <Input
                id="rn-display"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder="e.g. BSCS 2024"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRename}>Save name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating feedback toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-sidebar-primary px-4 py-3 text-sm font-medium text-sidebar-primary-foreground shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      <SampleFooter>
        Sample records for presentation · Reference date: 15 August 2025 · Static design
      </SampleFooter>
    </div>
  )
}
