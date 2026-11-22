import { FormField } from "@/components/features/form-field";
import { SearchInput } from "@/components/features/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  person: string;
  onPersonChange: (value: string) => void;
  student: string;
  onStudentChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  onReset: () => void;
}) {
  const hasFilters =
    person.trim() !== "" ||
    student.trim() !== "" ||
    action !== "all" ||
    fromDate !== "";

  return (
    <div className="grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-4">
      <FormField label="Person" htmlFor="audit-person">
        <SearchInput
          id="audit-person"
          placeholder="Search person name"
          value={person}
          onChange={(e) => onPersonChange(e.target.value)}
        />
      </FormField>

      <FormField label="Student" htmlFor="audit-student">
        <SearchInput
          id="audit-student"
          placeholder="Search student name or ID"
          value={student}
          onChange={(e) => onStudentChange(e.target.value)}
        />
      </FormField>

      <FormField label="Action" htmlFor="audit-action">
        <Select value={action} onValueChange={onActionChange}>
          <SelectTrigger
            id="audit-action"
            aria-label="Action"
            className="w-full min-w-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="View">View</SelectItem>
            <SelectItem value="Change">Change</SelectItem>
            <SelectItem value="Sign-in">Sign-in</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="From" htmlFor="audit-from">
        <Input
          id="audit-from"
          type="date"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
        />
      </FormField>

      <div className="flex justify-end md:col-span-2 xl:col-span-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasFilters}
          onClick={onReset}
        >
          Reset filters
        </Button>
      </div>
    </div>
  );
}
