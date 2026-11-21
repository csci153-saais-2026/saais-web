import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type ChecklistFilterValue =
  | "all"
  | "open"
  | "passed"
  | "inc"
  | "currently_enrolled"

export interface ChecklistFilterOption {
  readonly value: ChecklistFilterValue
  readonly label: string
}

const CHECKLIST_FILTER_OPTIONS: readonly ChecklistFilterOption[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Not yet taken" },
  { value: "passed", label: "Passed / credited" },
  { value: "inc", label: "INC" },
  { value: "currently_enrolled", label: "Currently enrolled" },
]

export interface ChecklistToolbarProps {
  readonly filter: ChecklistFilterValue
  readonly onFilterChange: (value: ChecklistFilterValue) => void
  readonly allCollapsed: boolean
  readonly onToggleAll: () => void
  readonly disableToggleAll?: boolean
  readonly className?: string
}

/**
 * Toolbar for the Student Curriculum Checklist:
 * status filter `<Select>` and `"Collapse all"` / `"Expand all"` toggle.
 */
export function ChecklistToolbar({
  filter,
  onFilterChange,
  allCollapsed,
  onToggleAll,
  disableToggleAll = false,
  className,
}: ChecklistToolbarProps) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <FormField
        label="Show requirements"
        htmlFor="checklist-status-filter"
        className="w-full sm:w-60"
      >
        <Select
          value={filter}
          onValueChange={(value) =>
            onFilterChange(value as ChecklistFilterValue)
          }
        >
          <SelectTrigger
            id="checklist-status-filter"
            aria-label="Show requirements"
            className="min-h-11 w-full md:min-h-[38px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHECKLIST_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onToggleAll}
          disabled={disableToggleAll}
          className="min-h-11 md:min-h-[38px]"
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </Button>
      </div>
    </div>
  )
}
