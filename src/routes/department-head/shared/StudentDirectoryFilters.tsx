import { useId } from "react"
import { FormField } from "@/components/features/form-field"
import { SearchInput } from "@/components/features/search-input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DirectoryStudent } from "./students-data"

type Props = {
  students: DirectoryStudent[]
  search: string
  curriculum: string
  adviser: string
  onSearchChange: (value: string) => void
  onCurriculumChange: (value: string) => void
  onAdviserChange: (value: string) => void
  onReset: () => void
  disabled?: boolean
}

/** The same directory filters are used by Students and Adviser Assignments. */
export function StudentDirectoryFilters({ students, search, curriculum, adviser, onSearchChange, onCurriculumChange, onAdviserChange, onReset, disabled = false }: Props) {
  const id = useId()
  const curricula = [...new Set([...students.map((student) => student.curriculum), ...(curriculum === "all" ? [] : [curriculum])])].sort()
  // Keep a selected zero-match option visible after local reassignments change the directory.
  const advisers = [...new Set([...students.map((student) => student.adviser), ...(adviser === "all" ? [] : [adviser])])].sort()
  return (
    <div className="grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_200px_240px_auto] xl:items-end">
      <FormField label="Search students" htmlFor={`${id}-search`}>
        <SearchInput id={`${id}-search`} placeholder="Search by student name or ID" value={search} onChange={(event) => onSearchChange(event.target.value)} disabled={disabled} />
      </FormField>
      <FormField label="Curriculum" htmlFor={`${id}-curriculum`}>
        <Select value={curriculum} onValueChange={onCurriculumChange} disabled={disabled}>
          <SelectTrigger id={`${id}-curriculum`} className="w-full min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All curricula</SelectItem>{curricula.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <FormField label="Adviser" htmlFor={`${id}-adviser`}>
        <Select value={adviser} onValueChange={onAdviserChange} disabled={disabled}>
          <SelectTrigger id={`${id}-adviser`} className="w-full min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All advisers</SelectItem>{advisers.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <Button type="button" variant="outline" onClick={onReset} disabled={disabled || !(search || curriculum !== "all" || adviser !== "all")} className="w-full self-end xl:w-auto">Reset filters</Button>
    </div>
  )
}
