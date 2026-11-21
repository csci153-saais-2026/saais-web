import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ApiSchema } from "@/lib/api/types"
import type { PdfReportPayload } from "@/lib/pdf/student-report-formatter"
import { createStudentReportPdf } from "@/lib/pdf/student-report-pdf"
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

/**
 * Shared PDF report preview modal that generates the actual downloadable PDF
 * with `createStudentReportPdf` and displays it in an embedded PDF viewer.
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
  const [preview, setPreview] = React.useState<{
    report: PdfReportPayload
    url: string
    error: boolean
  } | null>(null)

  const resolvedFilename =
    filename?.trim() ||
    (report
      ? `SAAIS-${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`
      : "SAAIS-report.pdf")

  const isCurrentPreview = Boolean(report && preview?.report === report)
  const url = isCurrentPreview ? preview?.url ?? "" : ""
  const error = isCurrentPreview ? Boolean(preview?.error) : false

  React.useEffect(() => {
    if (!open || !report) return

    let active = true
    let objectUrl = ""

    void createStudentReportPdf(report)
      .then((blob) => {
        if (!active) return
        objectUrl =
          typeof URL.createObjectURL === "function"
            ? URL.createObjectURL(blob)
            : ""
        setPreview({ report, url: objectUrl, error: false })
      })
      .catch(() => {
        if (active) setPreview({ report, url: "", error: true })
      })

    return () => {
      active = false
      if (objectUrl && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [open, report])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex h-[min(90dvh,900px)] w-[calc(100%-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]",
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
            {url ? (
              <Button asChild>
                <a
                  href={url}
                  download={resolvedFilename}
                  onClick={() => onPrint?.(eventType)}
                >
                  Download PDF
                </a>
              </Button>
            ) : (
              <Button type="button" disabled>
                Download PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        {url ? (
          <iframe
            title={`Preview: ${report?.title ?? "Report"}`}
            src={url}
            className="min-h-0 w-full flex-1 border-0 bg-neutral-800"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted p-4">
            {!report ? (
              <p className="text-cell text-muted-foreground">
                No report data to preview.
              </p>
            ) : error ? (
              <p role="alert" className="text-cell text-destructive">
                Unable to create the PDF preview. Close the preview and try
                again.
              </p>
            ) : (
              <p role="status" className="text-cell text-muted-foreground">
                Preparing PDF preview…
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
