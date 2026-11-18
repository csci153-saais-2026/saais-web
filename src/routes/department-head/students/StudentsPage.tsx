import { useState } from "react"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { UploadIcon } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StudentDirectoryFilters } from "../shared/StudentDirectoryFilters"
import { StudentRecordDialog } from "./StudentRecordDialog"
import { StudentImportDialog } from "./StudentImportDialog"
import { useDirectoryStudents } from "../shared/dh-queries"
import { QueryMessage } from "../shared/dh-ui"
import type { DirectoryStudent } from "../shared/students-types"

export default function StudentsPage() {
  const directory = useDirectoryStudents()
  const students = directory.data ?? []
  const [search, setSearch] = useState("")
  const [curriculum, setCurriculum] = useState("all")
  const [adviser, setAdviser] = useState("all")
  const [selected, setSelected] = useState<DirectoryStudent | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const query = search.trim().toLowerCase()
  const filtered = students.filter((student) => (
    (student.name.toLowerCase().includes(query) || student.studentNumber.toLowerCase().includes(query))
    && (curriculum === "all" || student.curriculum === curriculum)
    && (adviser === "all" || student.adviser === adviser)
  ))

  const heading = <PageHeading title="Students" subtitle="Find and review students across the Department of Computer Science and Technology."
    actions={<Button onClick={() => setImportOpen(true)}><UploadIcon />Import spreadsheet</Button>} />
  if (!directory.data) return <>{heading}<QueryMessage query={directory} label="students" /></>

  return (
    <>
      {heading}
      <Panel title="Department directory" description={`${students.length} enrolled students · BSCS and BSIT · AY 2025–2026, 1st semester`} flush>
        <StudentDirectoryFilters students={students} search={search} curriculum={curriculum} adviser={adviser}
          onSearchChange={setSearch} onCurriculumChange={setCurriculum} onAdviserChange={setAdviser}
          onReset={() => { setSearch(""); setCurriculum("all"); setAdviser("all") }} />
        <Table responsive aria-label="Department students">
          <TableHeader className="bg-secondary"><TableRow>
            {["Student", "School email", "Curriculum", "Year standing", "Adviser"].map((label) => <TableHead key={label} className="px-5 text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase">{label}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((student) => (
              <TableRow key={student.id} className="cursor-pointer" onClick={() => setSelected(student)}>
                <TableCell label="Student" className="px-5 py-3 whitespace-normal">
                  <Button type="button" variant="ghost" className="h-auto min-w-0 flex-col items-start gap-0.5 rounded-sm p-0 text-left font-normal whitespace-normal hover:bg-transparent hover:text-primary" onClick={() => setSelected(student)} aria-label={`View ${student.name} checklist`}>
                    <span className="block font-semibold">{student.name}</span>
                    <span className="block font-mono text-xs font-normal text-muted-foreground">{student.studentNumber}</span>
                  </Button>
                </TableCell>
                <TableCell label="School email" className="px-5 py-3 text-[13.5px] whitespace-normal"><span className="min-w-0 break-all">{student.email}</span></TableCell>
                <TableCell label="Curriculum" className="px-5 py-3"><Badge variant="secondary" className="rounded-sm">{student.curriculum}</Badge></TableCell>
                <TableCell label="Year standing" className="px-5 py-3 text-[13.5px]">{student.yearStanding}</TableCell>
                <TableCell label="Adviser" className="px-5 py-3 text-[13.5px] whitespace-normal"><span className="min-w-0">{student.adviser}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && <div className="px-5 py-10 text-center"><p className="font-semibold">No students match these filters.</p><p className="mt-1 text-sm text-muted-foreground">Change your search or reset the filters.</p></div>}
        <p role="status" aria-live="polite" aria-atomic="true" className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Showing {filtered.length} of {students.length} students</p>
      </Panel>
      {selected && <StudentRecordDialog key={selected.id} student={selected} onClose={() => setSelected(null)} />}
      {importOpen && <StudentImportDialog onClose={() => setImportOpen(false)} />}
    </>
  )
}
