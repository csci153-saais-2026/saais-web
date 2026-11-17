import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import type { FacultyDepartmentReport } from "@/routes/dean/types"
import {
  buildFacultyReportFilename,
  createFacultyReportPdf,
} from "@/routes/dean/utils/faculty-report-pdf"

/** Opens faculty report export in an embedded viewer first; nothing downloads until the user chooses Download PDF. */
export function DeanPdfViewerDialog({
  report,
  onClose,
  onDownloaded,
}: {
  report: FacultyDepartmentReport | null
  onClose: () => void
  onDownloaded?: (report: FacultyDepartmentReport) => void
}) {
  const { user } = useAuth()
  const [preview, setPreview] = useState<{
    source: FacultyDepartmentReport
    url: string
    error: boolean
  } | null>(null)

  const current = report !== null && preview?.source === report ? preview : null
  const filename = report ? buildFacultyReportFilename(report.department) : ""

  useEffect(() => {
    if (!report) return
    let active = true
    let objectUrl = ""

    createFacultyReportPdf(report, {
      facultyName: "Faculty of Computing",
      deanName: user?.fullName,
    })
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreview({ source: report, url: objectUrl, error: false })
      })
      .catch(() => {
        if (active) {
          setPreview({ source: report, url: "", error: true })
        }
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [report, user?.fullName])

  return (
    <Dialog open={report !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(90dvh,900px)] w-[calc(100%-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]"
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 p-4">
          <div>
            <DialogTitle className="text-base">Preview: Faculty reports</DialogTitle>
            <DialogDescription className="mt-1 text-xs">{filename}</DialogDescription>
          </div>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
            {current?.url ? (
              <Button size="sm" asChild>
                <a
                  href={current.url}
                  download={filename}
                  onClick={() => {
                    if (report) onDownloaded?.(report)
                  }}
                >
                  Download PDF
                </a>
              </Button>
            ) : (
              <Button type="button" size="sm" disabled>
                Download PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        {current?.url ? (
          <iframe
            title="PDF preview"
            src={current.url}
            className="min-h-0 w-full flex-1 border-0 bg-neutral-800"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted p-4">
            {current?.error ? (
              <p role="alert">Unable to create the PDF. Close the preview and try again.</p>
            ) : (
              <p role="status">Preparing PDF preview…</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
