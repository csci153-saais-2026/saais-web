import { PdfViewerDialog as SharedPdfViewerDialog } from "@/components/features/pdf-viewer-dialog";
import type { DepartmentPdfDocument } from "./department-pdf";
import { useDepartmentPdfUrl } from "./useDepartmentPdfUrl";

/** Compatibility wrapper while the report and term pages move to the shared viewer. */
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
      title={document?.title ?? ""}
      filename={document?.filename ?? ""}
      url={preview.url}
      error={preview.error}
    />
  );
}
