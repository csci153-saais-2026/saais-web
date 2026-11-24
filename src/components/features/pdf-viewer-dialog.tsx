import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface PdfViewerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Shown as "Preview: {title}". */
  readonly title: string;
  /** Shown under the title and used as the download file name. */
  readonly filename: string;
  /**
   * Object URL of the generated PDF. While it is empty and `error` is false the
   * dialog shows the "Preparing PDF preview…" state and Download stays disabled.
   */
  readonly url?: string;
  /** Generation failed: shows the error message instead of the viewer. */
  readonly error?: boolean;
  /** Called when the user chooses Download PDF (e.g. to write an audit event). */
  readonly onDownload?: () => void;
  readonly className?: string;
}

/**
 * Presentational PDF viewer modal shared by the Dean and Department Head portals.
 * The caller builds the PDF and owns the object URL's lifecycle (create and revoke it);
 * this component only displays it, so nothing downloads until the user chooses Download PDF.
 */
function PdfViewerDialog({
  open,
  onOpenChange,
  title,
  filename,
  url,
  error = false,
  onDownload,
  className,
}: PdfViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex h-[min(90dvh,900px)] w-[calc(100%-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-275",
          className,
        )}
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-line-soft px-6 py-4">
          <div className="min-w-0">
            <DialogTitle
              className="truncate text-heading font-semibold text-foreground"
              title={title}
            >
              Preview: {title}
            </DialogTitle>
            <DialogDescription
              className="mt-0.5 truncate font-mono text-caption text-muted-foreground"
              title={filename}
            >
              {filename}
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
                <a href={url} download={filename} onClick={onDownload}>
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
            title={`Preview: ${title}`}
            src={url}
            className="min-h-0 w-full flex-1 border-0 bg-neutral-800"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted p-4">
            {error ? (
              <p role="alert" className="text-cell text-destructive">
                Unable to create the PDF. Close the preview and try again.
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
  );
}

export { PdfViewerDialog };
