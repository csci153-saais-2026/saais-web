import { PdfViewerDialog as SharedPdfViewerDialog } from "@/components/features/pdf-viewer-dialog";
import type { DepartmentPdfDocument } from "./department-pdf";
import { useDepartmentPdfUrl } from "./useDepartmentPdfUrl";

/** Compatibility adapter for existing department pages using document/onClose props. */
export function PdfViewerDialog({
  document,
  onClose,
}: {
  document: DepartmentPdfDocument | null;
  onClose: () => void;
}) {
  const preview = useDepartmentPdfUrl(document);

  return (
    <SharedPdfViewerDialog
      open={document !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={document?.title ?? "Academic terms"}
      filename={document?.filename ?? "academic-terms.pdf"}
      url={preview.url}
      error={preview.error}
    />
  );
}
