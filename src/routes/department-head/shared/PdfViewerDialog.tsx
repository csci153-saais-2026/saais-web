import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DepartmentPdfDocument } from "./department-pdf";
import { useDepartmentPdfUrl } from "./useDepartmentPdfUrl";

/** Opens an export in a viewer first; nothing downloads until the user chooses Download PDF. */
export function PdfViewerDialog({
  document: report,
  onClose,
}: {
  document: DepartmentPdfDocument | null;
  onClose: () => void;
}) {
  const current = useDepartmentPdfUrl(report);

  return (
    <Dialog
      open={report !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(90dvh,900px)] w-[calc(100%-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]"
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <DialogTitle className="text-base" title={report?.title}>
              Preview: {report?.title}
            </DialogTitle>
            <DialogDescription
              className="mt-1 truncate text-xs"
              title={report?.filename}
            >
              {report?.filename}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
            {current?.url ? (
              <Button size="sm" asChild>
                <a href={current.url} download={report?.filename}>
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
              <p role="alert">
                Unable to create the PDF. Close the preview and try again.
              </p>
            ) : (
              <p role="status">Preparing PDF preview…</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
