import * as React from "react"
import { FlagIcon } from "@/components/icons"
import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export type ImportPreviewRow = {
  rowNumber: number | string
  studentNumber: string
  /** `pass` renders the green pill, `fail` the red one. */
  tone: "pass" | "fail"
  /** Text inside the Result pill. */
  result: string
}

const PILL = {
  pass: "inline-flex items-center gap-1.5 rounded-sm bg-[var(--status-pass-bg)] px-2 py-1 font-semibold text-[var(--status-pass)]",
  fail: "inline-flex items-center gap-1.5 rounded-sm bg-[var(--status-fail-bg)] px-2 py-1 font-semibold text-[var(--status-fail)]",
}
const DOT = { pass: "bg-[var(--status-pass)]", fail: "bg-[var(--status-fail)]" }

const FILE_INPUT =
  "block min-h-[54px] w-full rounded-sm border border-border bg-background px-4 py-3 font-sans text-body font-semibold file:mr-2 file:inline-flex file:appearance-auto file:items-center file:rounded-sm file:border file:border-solid file:border-[#767676] file:bg-[#efefef] file:px-2 file:py-0 file:font-sans file:text-base file:font-normal file:text-foreground hover:file:bg-[#e7e7e7]"

/**
 * Presentational "Import students from spreadsheet" modal shared by the staff and
 * department-head portals: notice, file field, Row / Student ID / Result validation table
 * and a Cancel / primary footer. Parsing, validation and submission stay with the caller.
 */
function StudentImportModal({
  open,
  onOpenChange,
  trigger,
  title = "Import students from spreadsheet",
  notice,
  fileHint = "XLSX or CSV · IDs must follow YY-N-NNNNN (example: 24-1-00124).",
  fileError,
  fileDisabled,
  inputRef,
  inputProps,
  onFileChange,
  previewHeading = "Validation preview",
  previewCaption = "Student import validation results",
  rows,
  emptyMessage = "Choose a spreadsheet to validate its rows.",
  children,
  cancelLabel = "Cancel",
  cancelDisabled,
  primaryLabel,
  primaryDisabled,
  onPrimary,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional trigger button; rendered with `asChild`. */
  trigger?: React.ReactNode
  title?: string
  notice: React.ReactNode
  fileHint?: string
  fileError?: string
  fileDisabled?: boolean
  inputRef?: React.Ref<HTMLInputElement>
  inputProps?: Omit<React.ComponentProps<"input">, "type" | "id" | "accept" | "onChange" | "disabled">
  onFileChange: (file: File | undefined) => void
  previewHeading?: string
  previewCaption?: string
  rows: ImportPreviewRow[]
  /** Shown in the table body when there are no rows. */
  emptyMessage?: React.ReactNode
  /** Status lines, errors and result tables rendered under the validation table. */
  children?: React.ReactNode
  cancelLabel?: string
  cancelDisabled?: boolean
  primaryLabel: string
  primaryDisabled?: boolean
  onPrimary: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-md p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4.5 pr-14">
          <DialogTitle className="font-heading text-[24px] leading-[1.08] font-bold tracking-[-0.01em]">{title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 space-y-6 overflow-y-auto p-6">
          <div className="flex items-center gap-4 rounded-md border border-notice-advisory-border bg-notice-advisory-bg px-5 py-4 text-sm text-notice-advisory">
            <FlagIcon className="size-5 shrink-0" />
            <p>{notice}</p>
          </div>

          <FormField label="Spreadsheet file" htmlFor="student-import-file" hint={fileHint} error={fileError}>
            <input
              {...inputProps}
              id="student-import-file"
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              disabled={fileDisabled}
              aria-invalid={!!fileError}
              className={FILE_INPUT}
              onChange={(event) => onFileChange(event.currentTarget.files?.[0])}
            />
          </FormField>

          <section aria-label="Validation preview" className="space-y-3">
            <h3 className="text-heading font-semibold">{previewHeading}</h3>
            <div className="max-h-64 overflow-auto border-y">
              <table className="w-full min-w-lg border-collapse text-left text-sm">
                <caption className="sr-only">{previewCaption}</caption>
                <thead className="sticky top-0 bg-cream-deep text-xs tracking-wider text-muted-2 uppercase">
                  <tr>
                    {["Row", "Student ID", "Result"].map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {rows.length === 0 ? (
                    <tr><td colSpan={3} className="h-24 px-4 text-center text-muted-foreground">{emptyMessage}</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.rowNumber} className="border-t border-border">
                      <td className="px-4 py-3">{row.rowNumber}</td>
                      <td className="px-4 py-3">{row.studentNumber || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={PILL[row.tone]}>
                          <span aria-hidden="true" className={`size-2 rounded-full ${DOT[row.tone]}`} />
                          {row.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {children}
          </section>
        </div>

        <div className="border-t border-border px-6 py-4">
          <DialogFooter className="flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={cancelDisabled}>{cancelLabel}</Button>
            <Button type="button" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { StudentImportModal }
