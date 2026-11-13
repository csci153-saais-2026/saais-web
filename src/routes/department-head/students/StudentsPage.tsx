import { useState } from "react"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { UploadIcon } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StudentDirectoryFilters } from "../shared/StudentDirectoryFilters"
import { StudentChecklistPreviewDialog } from "./StudentChecklistPreviewDialog"
import { StudentImportDialog } from "./StudentImportDialog"
import { useDepartmentHeadPreview } from "../shared/preview-state"
import type { DirectoryStudent } from "../shared/students-data"

export default function StudentsPage() {
  const { students } = useDepartmentHeadPreview()
  const [search, setSearch] = useState("")
  const [curriculum, setCurriculum] = useState("all")
  const [adviser, setAdviser] = useState("all")
  const [preview, setPreview] = useState<DirectoryStudent | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const query = search.trim().toLowerCase()
  const filtered = students.filter((student) => (
    (student.name.toLowerCase().includes(query) || student.studentNumber.toLowerCase().includes(query))
    && (curriculum === "all" || student.curriculum === curriculum)
    && (adviser === "all" || student.adviser === adviser)
  ))

  return (
    <>
      <PageHeading title="Students" subtitle="Find and review students across the Department of Computer Science and Technology."
        actions={<Button onClick={() => setImportOpen(true)}><UploadIcon />Preview spreadsheet import</Button>} />
      <Panel title="Department directory" description="Select a student to open a read-only checklist preview." flush>
        <StudentDirectoryFilters students={students} search={search} curriculum={curriculum} adviser={adviser}
          onSearchChange={setSearch} onCurriculumChange={setCurriculum} onAdviserChange={setAdviser}
          onReset={() => { setSearch(""); setCurriculum("all"); setAdviser("all") }} />
        <Table responsive aria-label="Department students">
          <TableHeader className="bg-secondary"><TableRow>
            {["Student", "School email", "Curriculum", "Year standing", "Adviser"].map((label) => <TableHead key={label}>{label}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((student) => (
              <TableRow key={student.id}>
                <TableCell label="Student" className="whitespace-normal">
                  <button type="button" className="min-w-0 text-inherit underline-offset-4 hover:text-primary hover:underline" onClick={() => setPreview(student)} aria-label={`View ${student.name} checklist`}>
                    <span className="block font-semibold">{student.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{student.studentNumber}</span>
                  </button>
                </TableCell>
                <TableCell label="School email" className="whitespace-normal"><span className="min-w-0 break-all">{student.email}</span></TableCell>
                <TableCell label="Curriculum"><Badge variant="secondary" className="rounded-sm">{student.curriculum}</Badge></TableCell>
                <TableCell label="Year standing">{student.yearStanding}</TableCell>
                <TableCell label="Adviser" className="whitespace-normal"><span className="min-w-0">{student.adviser}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && <div className="px-5 py-10 text-center"><p className="font-semibold">No students match these filters.</p><p className="mt-1 text-sm text-muted-foreground">Change your search or reset the filters.</p></div>}
        <p role="status" aria-live="polite" aria-atomic="true" className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Showing {filtered.length} of {students.length} sample students</p>
      </Panel>
      {preview && <StudentChecklistPreviewDialog key={preview.id} student={preview} onClose={() => setPreview(null)} />}
      {importOpen && <StudentImportDialog onClose={() => setImportOpen(false)} />}
    </>
  )
}
