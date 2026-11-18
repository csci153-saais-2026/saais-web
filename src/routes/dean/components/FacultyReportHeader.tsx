import { DownloadIcon } from "@/components/icons"
import { PageHeading } from "@/components/features/page-heading"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DepartmentFilter } from "@/routes/dean/types"

export function FacultyReportHeader({
  department,
  departments = ["All departments"],
  onDepartmentChange,
  onExportPdf,
  disabled = false,
}: {
  department: DepartmentFilter
  departments?: string[]
  onDepartmentChange: (department: DepartmentFilter) => void
  onExportPdf: () => void
  disabled?: boolean
}) {
  const scopeMeta =
    department === "All departments"
      ? "Faculty of Computing · read-only"
      : `Faculty of Computing · ${department} · read-only`

  return (
    <PageHeading
      title="Faculty reports"
      subtitle={scopeMeta}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={department}
            onValueChange={onDepartmentChange}
            disabled={disabled}
          >
            <SelectTrigger aria-label="Department" className="w-[200px] bg-card">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" onClick={onExportPdf} disabled={disabled}>
            <DownloadIcon />
            Download PDF
          </Button>
        </div>
      }
    />
  )
}
