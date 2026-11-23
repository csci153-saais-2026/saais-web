import { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthContext } from "@/context/auth-context";
import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api";
import {
  createDepartmentPdf,
  type DepartmentPdfDocument,
} from "./department-pdf";

/** Opens an export in a viewer first; nothing downloads until the user chooses Download PDF. */
export function PdfViewerDialog({
  document: report,
  onClose,
}: {
  document: DepartmentPdfDocument | null;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<{
    source: DepartmentPdfDocument;
    url: string;
    error: boolean;
  } | null>(null);
  const departmentId = useContext(AuthContext)?.profile?.department_id;
  const current =
    report !== null && preview?.source === report ? preview : null;

  useEffect(() => {
    if (!report) return;
    let active = true;
    let objectUrl = "";
    const build = async () => {
      let department;
      if (departmentId) {
        const rows = unwrapApiResult(
          await apiClient.GET("/rest/v1/department", {
            params: {
              query: {
                id: postgrestFilter.eq(departmentId),
                select:
                  "id,faculty_id,name,code,letterhead_prefix,letterhead_name,department_head_name,dean_name",
                limit: 1,
              },
            },
          }),
        );
        department = rows.find((row) => row.id === departmentId);
      }
      return createDepartmentPdf(report, department);
    };
    build()
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ source: report, url: objectUrl, error: false });
      })
      .catch(() => {
        if (active) setPreview({ source: report, url: "", error: true });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [report, departmentId]);

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
          <div>
            <DialogTitle className="text-base">
              Preview: {report?.title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {report?.filename}
            </DialogDescription>
          </div>
          <div className="flex gap-2">
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
