import { useEffect, useState } from "react";
import type { ApiSchema } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createDashboardPdf, dashboardPdfFilename } from "./export-dashboard";
import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api";

export function DashboardPdfPreview({
  report,
  termLabel,
  deficiencyCount,
  adviserName,
  departmentId,
  onClose,
}: {
  report: ApiSchema<"AdviserDashboardReport">;
  termLabel: string;
  deficiencyCount?: number;
  adviserName?: string;
  departmentId?: string | null;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<{
    report: ApiSchema<"AdviserDashboardReport">;
    termLabel: string;
    deficiencyCount?: number;
    adviserName?: string;
    departmentId?: string | null;
    url: string;
    error: boolean;
  } | null>(null);
  const isCurrentPreview =
    preview?.report === report &&
    preview.termLabel === termLabel &&
    preview.deficiencyCount === deficiencyCount &&
    preview.adviserName === adviserName &&
    preview.departmentId === departmentId;
  const url = isCurrentPreview ? preview.url : "";
  const error = isCurrentPreview && preview.error;

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const prepare = async () => {
      let department: ApiSchema<"Department"> | undefined;
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
        if (!department) throw new Error("Department unavailable");
      }
      return createDashboardPdf(
        report,
        termLabel,
        deficiencyCount,
        adviserName,
        department,
      );
    };
    void prepare()
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({
          report,
          termLabel,
          deficiencyCount,
          adviserName,
          departmentId,
          url: objectUrl,
          error: false,
        });
      })
      .catch(() => {
        if (active)
          setPreview({
            report,
            termLabel,
            deficiencyCount,
            adviserName,
            departmentId,
            url: "",
            error: true,
          });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [report, termLabel, deficiencyCount, adviserName, departmentId]);

  return (
    <Dialog
      open
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
            <DialogTitle className="text-base">Preview: Dashboard</DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {dashboardPdfFilename}
            </DialogDescription>
          </div>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
            {url ? (
              <Button size="sm" asChild>
                <a href={url} download={dashboardPdfFilename}>
                  Download PDF
                </a>
              </Button>
            ) : (
              <Button size="sm" disabled>
                Download PDF
              </Button>
            )}
          </div>
        </DialogHeader>
        {url ? (
          <iframe
            title="Dashboard PDF preview"
            src={url}
            className="min-h-0 w-full flex-1 border-0 bg-neutral-800"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted p-4">
            {error ? (
              <p role="alert">
                Unable to create the dashboard PDF. Close the preview and try
                again.
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
