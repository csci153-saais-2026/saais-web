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
import { DEPARTMENT_OPTIONS } from "@/routes/dean/data/faculty-reports"
import type { DepartmentFilter } from "@/routes/dean/types"

export function FacultyReportHeader({
  department,
  onDepartmentChange,
  onExportPdf,
}: {
  department: DepartmentFilter
  onDepartmentChange: (department: DepartmentFilter) => void
  onExportPdf: () => void
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
            onValueChange={(value) => onDepartmentChange(value as DepartmentFilter)}
          >
            <SelectTrigger aria-label="Department" className="w-[180px] bg-card">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" onClick={onExportPdf}>
            <DownloadIcon />
            Download PDF
          </Button>
        </div>
      }
    />
  )
}
