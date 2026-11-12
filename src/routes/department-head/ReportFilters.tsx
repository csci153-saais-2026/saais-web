import { FormField } from "@/components/features/form-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { REPORT_PROGRAMS, REPORT_TERMS, type ProgramKey } from "./reports-data"

export function ReportFilters({
  term, program, onTermChange, onProgramChange,
}: {
  term: string
  program: ProgramKey
  onTermChange: (value: string) => void
  onProgramChange: (value: ProgramKey) => void
}) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <FormField label="Academic term" htmlFor="report-term">
        <Select value={term} onValueChange={onTermChange}>
          <SelectTrigger id="report-term" className="w-full min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_TERMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Degree program" htmlFor="report-program">
        <Select value={program} onValueChange={(value) => onProgramChange(value as ProgramKey)}>
          <SelectTrigger id="report-program" className="w-full min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_PROGRAMS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  )
}
