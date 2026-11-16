import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function FacultyAuditFilters({
  person,
  onPersonChange,
  student,
  onStudentChange,
  action,
  onActionChange,
  fromDate,
  onFromDateChange,
  onReset,
}: {
  person: string
  onPersonChange: (value: string) => void
  student: string
  onStudentChange: (value: string) => void
  action: string
  onActionChange: (value: string) => void
  fromDate: string
  onFromDateChange: (value: string) => void
  onReset: () => void
}) {
  const hasFilters =
    person.trim() !== "" ||
    student.trim() !== "" ||
    action !== "all" ||
    fromDate !== ""

  return (
    <div className="grid gap-4 rounded-md border border-border bg-card p-4 md:grid-cols-12 md:items-end">
      <div className="md:col-span-3">
        <FormField label="Person" htmlFor="audit-person">
          <Input
            id="audit-person"
            placeholder="Name or role"
            value={person}
            onChange={(e) => onPersonChange(e.target.value)}
          />
        </FormField>
      </div>

      <div className="md:col-span-3">
        <FormField label="Student" htmlFor="audit-student">
          <Input
            id="audit-student"
            placeholder="Name or number"
            value={student}
            onChange={(e) => onStudentChange(e.target.value)}
          />
        </FormField>
      </div>

      <div className="md:col-span-2">
        <FormField label="Action" htmlFor="audit-action">
          <Select value={action} onValueChange={onActionChange}>
            <SelectTrigger id="audit-action" aria-label="Action">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="View">View</SelectItem>
              <SelectItem value="Change">Change</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="md:col-span-3">
        <FormField label="From" htmlFor="audit-from">
          <Input
            id="audit-from"
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
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
