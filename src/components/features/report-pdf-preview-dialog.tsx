import { DownloadIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ApiSchema } from "@/lib/api/types"
import type { PdfReportPayload } from "@/lib/pdf/student-report-formatter"
import { cn } from "@/lib/utils"

export type ReportAuditEventType = ApiSchema<"AuditViewEventRequest">["event_type"]

export interface ReportPdfPreviewDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly report: PdfReportPayload | null
  readonly filename?: string
  readonly eventType?: ReportAuditEventType
  readonly onPrint?: (eventType: ReportAuditEventType) => void
  readonly className?: string
}

const NUMERIC_HEADERS: ReadonlySet<string> = new Set([
  "Units",
  "Grade",
  "Midterm",
  "Final / completion",
  "Completion",
])

/**
 * Shared PDF report preview modal rendering the formatted payload from `student-report-formatter.ts`
 * with institutional letterhead, student metadata, section tables, signatories, and footer.
 */
export function ReportPdfPreviewDialog({
  open,
  onOpenChange,
  report,
  filename,
  eventType = "pdf_exported",
  onPrint,
  className,
}: ReportPdfPreviewDialogProps) {
  const resolvedFilename =
    filename?.trim() ||
    (report
      ? `SAAIS-${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`
      : "SAAIS-report.pdf")

  function handlePrint() {
    onPrint?.(eventType)
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]",
          className
        )}
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-line-soft px-6 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-heading font-semibold text-foreground">
              Preview: {report?.title ?? "Report"}
            </DialogTitle>
            <DialogDescription className="mt-0.5 font-mono text-caption text-muted-foreground">
              {resolvedFilename}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={!report}
            >
              <DownloadIcon className="size-4" />
              Print / Save as PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-secondary p-4 md:p-6">
          {report ? (
            <article
              aria-label={report.title}
              className="mx-auto max-w-[842px] rounded-md border border-border bg-card text-foreground"
            >
              <div className="h-2 w-full rounded-t-md bg-primary" aria-hidden="true" />

              <div className="grid gap-6 p-6 md:p-8">
                {/* Institutional Letterhead */}
                <header className="flex items-center gap-4 border-b border-border pb-5">
                  <div
                    className="h-12 w-1 shrink-0 rounded-xs bg-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-cell font-medium text-primary">
                      {report.unit.prefix}
                    </p>
                    <h2 className="font-heading text-display-m font-bold tracking-tight text-primary uppercase">
                      {report.unit.name}
                    </h2>
                  </div>
                </header>

                {/* Document Title */}
                <div className="text-center">
                  <h3 className="font-heading text-heading font-bold tracking-wider text-foreground uppercase">
                    {report.title}
                  </h3>
                </div>

                {/* Student Metadata Pairs */}
                {report.info.length > 0 && (
                  <dl className="grid gap-x-6 gap-y-2 rounded-md border border-line-soft bg-background px-4 py-3 text-cell sm:grid-cols-2 md:grid-cols-3">
                    {report.info.map(([label, value]) => (
                      <div key={label} className="flex items-baseline gap-1.5">
                        <dt className="font-semibold text-muted-foreground">
                          {label}:
                        </dt>
                        <dd
                          className={cn(
                            "text-foreground",
                            label === "Student no." && "font-mono tabular-nums"
                          )}
                        >
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {/* Summary Stats Band */}
                {report.stats.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4 rounded-md border border-notice-success-border bg-notice-success-bg px-4 py-2.5 text-cell font-semibold text-notice-success">
                    {report.stats.map((stat) => (
                      <span key={stat.label} className="tabular-nums">
                        {stat.label}: {stat.value}
                        {stat.note ? ` (${stat.note})` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* Report Sections */}
                <div className="grid gap-6">
                  {report.sections.map((section) => (
                    <section key={section.title} className="grid gap-2.5">
                      <h4 className="text-heading font-semibold text-foreground">
                        {section.title}
                      </h4>
                      <div className="overflow-hidden rounded-md border border-border bg-card">
                        <Table responsive>
                          <TableHeader className="bg-secondary">
                            <TableRow>
                              {section.headers.map((header) => (
                                <TableHead
                                  key={header}
                                  scope="col"
                                  className="px-3.5 py-2.5 text-kicker font-semibold text-muted-2 uppercase"
                                >
                                  {header}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {section.rows.map((row, rowIndex) => (
                              <TableRow
                                key={`${section.title}-${rowIndex}`}
                                className="border-line-soft"
                              >
                                {section.headers.map((header, colIndex) => {
                                  const cellValue = row[colIndex] || "—"
                                  const isMono =
                                    header === "Code" || NUMERIC_HEADERS.has(header)
                                  return (
                                    <TableCell
                                      key={header}
                                      label={header}
                                      className={cn(
                                        "px-3.5 py-row text-cell text-foreground",
                                        isMono && "font-mono tabular-nums"
                                      )}
                                    >
                                      {cellValue}
                                    </TableCell>
                                  )
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </section>
                  ))}
                </div>

                {/* Signatory Blocks */}
                {report.signatories.length > 0 && (
                  <div className="mt-4 grid gap-6 pt-6 sm:grid-cols-2">
                    {report.signatories.map((sig) => (
                      <div key={sig.role} className="text-center">
                        <div className="mx-auto mb-2 w-56 border-b border-foreground" />
                        {sig.name && (
                          <strong className="block text-cell font-semibold text-foreground">
                            {sig.name}
                          </strong>
                        )}
                        <span className="block text-caption text-muted-foreground">
                          {sig.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Report Footer */}
                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4 text-caption text-muted-foreground">
                  <span>{report.footer}</span>
                  <span className="font-mono tabular-nums">Page 1 of 1</span>
                </footer>
              </div>
            </article>
          ) : (
            <p className="py-12 text-center text-cell text-muted-foreground">
              No report data to preview.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
