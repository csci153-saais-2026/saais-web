import { useId } from "react";
import { FormField } from "@/components/features/form-field";
import { SearchInput } from "@/components/features/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  disabled = false,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  curriculum: string;
  onCurriculumChange: (value: string) => void;
  curriculumOptions: string[];
  adviser: string;
  onAdviserChange: (value: string) => void;
  adviserOptions: string[];
  onReset: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const hasFilters =
    query.trim() !== "" || curriculum !== "all" || adviser !== "all";

  return (
    <div
      data-filter-group="students"
      className="grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_200px_240px_auto] xl:items-end"
    >
      <FormField label="Search students" htmlFor={`${id}-search`}>
        <SearchInput
          id={`${id}-search`}
          placeholder="Search by student name or ID"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          disabled={disabled}
        />
      </FormField>

      <FormField label="Curriculum" htmlFor={`${id}-curriculum`}>
        <Select
          value={curriculum}
          onValueChange={onCurriculumChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${id}-curriculum`}
            aria-label="Curriculum"
            className="w-full min-w-0"
          >
            <SelectValue />
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

      <FormField label="Adviser" htmlFor={`${id}-adviser`}>
        <Select
          value={adviser}
          onValueChange={onAdviserChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${id}-adviser`}
            aria-label="Adviser"
            className="w-full min-w-0"
          >
            <SelectValue />
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

      <Button
        type="button"
        variant="outline"
        disabled={disabled || !hasFilters}
        onClick={onReset}
        className="w-full self-end xl:w-auto"
      >
        Reset filters
      </Button>
    </div>
  );
}
