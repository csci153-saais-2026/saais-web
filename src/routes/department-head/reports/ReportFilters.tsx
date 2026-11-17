import { FormField } from "@/components/features/form-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ALL_PROGRAMS, type ReportOption } from "./report-model"

export function ReportFilters({
  term, program, terms, programs, onTermChange, onProgramChange,
}: {
  term: string
  program: string
  terms: ReportOption[]
  programs: ReportOption[]
  onTermChange: (value: string) => void
  onProgramChange: (value: string) => void
}) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <FormField label="Academic term" htmlFor="report-term">
        <Select value={term} onValueChange={onTermChange}>
          <SelectTrigger id="report-term" className="w-full min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">
            {terms.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Degree program" htmlFor="report-program">
        <Select value={program} onValueChange={onProgramChange}>
          <SelectTrigger id="report-program" className="w-full min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL_PROGRAMS}>All department programs</SelectItem>
            {programs.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  )
}
