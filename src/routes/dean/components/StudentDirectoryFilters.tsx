import { FormField } from "@/components/features/form-field"
import { SearchInput } from "@/components/features/search-input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function StudentDirectoryFilters({
  query,
  onQueryChange,
  curriculum,
  onCurriculumChange,
  curriculumOptions,
  adviser,
  onAdviserChange,
  adviserOptions,
  onReset,
}: {
  query: string
  onQueryChange: (value: string) => void
  curriculum: string
  onCurriculumChange: (value: string) => void
  curriculumOptions: string[]
  adviser: string
  onAdviserChange: (value: string) => void
  adviserOptions: string[]
  onReset: () => void
}) {
  const hasFilters = query.trim() !== "" || curriculum !== "all" || adviser !== "all"

  return (
    <div
      data-filter-group="students"
      className="grid gap-4 rounded-md border border-border bg-card p-4 md:grid-cols-12 md:items-end"
    >
      <div className="md:col-span-5">
        <FormField label="Search students" htmlFor="dean-student-query">
          <SearchInput
            id="dean-student-query"
            placeholder="Name or student number"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </FormField>
      </div>

      <div className="md:col-span-3">
        <FormField label="Curriculum" htmlFor="dean-student-curriculum">
          <Select value={curriculum} onValueChange={onCurriculumChange}>
            <SelectTrigger id="dean-student-curriculum" aria-label="Curriculum">
              <SelectValue placeholder="All curricula" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All curricula</SelectItem>
              {curriculumOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="md:col-span-3">
        <FormField label="Adviser" htmlFor="dean-student-adviser">
          <Select value={adviser} onValueChange={onAdviserChange}>
            <SelectTrigger id="dean-student-adviser" aria-label="Adviser">
              <SelectValue placeholder="All advisers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All advisers</SelectItem>
              {adviserOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="md:col-span-1 md:flex md:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasFilters}
          onClick={onReset}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}

