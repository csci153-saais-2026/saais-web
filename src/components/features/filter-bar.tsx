import { SearchInput } from "@/components/features/search-input"
import { FormField } from "@/components/features/form-field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Option = { value: string; label: string }

/** Search + select filter row, with an optional segmented toggle (e.g. Current / Past). */
function FilterBar({
  searchLabel = "Search",
  searchPlaceholder,
  search,
  onSearchChange,
  filterLabel = "Filter",
  filterOptions,
  filter,
  onFilterChange,
  toggleOptions,
  toggle,
  onToggleChange,
}: {
  searchLabel?: string
  searchPlaceholder?: string
  search: string
  onSearchChange: (value: string) => void
  filterLabel?: string
  filterOptions: Option[]
  filter: string
  onFilterChange: (value: string) => void
  toggleOptions?: Option[]
  toggle?: string
  onToggleChange?: (value: string) => void
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end">
      <FormField label={searchLabel} htmlFor="filter-search" className="flex-1">
        <SearchInput
          id="filter-search"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </FormField>
      <FormField label={filterLabel} htmlFor="filter-select" className="md:w-56">
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger id="filter-select" className="h-10 w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      {toggleOptions && (
        <ToggleGroup
          type="single"
          value={toggle}
          onValueChange={(v) => v && onToggleChange?.(v)}
          spacing={1}
          className="rounded-md bg-muted p-1"
          aria-label="View"
        >
          {toggleOptions.map((o) => (
            <ToggleGroupItem key={o.value} value={o.value} className="h-8 px-3 font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {o.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  )
}

export { FilterBar }
export type { Option as FilterOption }
