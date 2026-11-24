import { useEffect, useState } from "react";
import {
  buildFacultyReportFilename,
  createFacultyReportPdf,
} from "@/routes/dean/reports/faculty-report-pdf";
import type { FacultyDepartmentReport } from "@/routes/dean/types";

/**
 * Generates the faculty report PDF blob when a report is open for preview, manages
 * its object URL lifecycle, and discards stale async results if inputs change.
 */
export function useFacultyReportPdfPreview({
  report,
  facultyName,
  deanName,
}: {
  report: FacultyDepartmentReport | null;
  facultyName?: string | null;
  deanName?: string;
}): {
  filename: string;
  url: string;
  error: boolean;
} {
  const [preview, setPreview] = useState<{
    source: FacultyDepartmentReport;
    facultyName?: string | null;
    deanName?: string;
    url: string;
    error: boolean;
  } | null>(null);

  const current =
    report !== null &&
    preview?.source === report &&
    preview.facultyName === facultyName &&
    preview.deanName === deanName
      ? preview
      : null;

  const filename = report ? buildFacultyReportFilename(report.department) : "";

  useEffect(() => {
    if (!report) return;
    let active = true;
    let objectUrl = "";

    createFacultyReportPdf(report, {
      facultyName: facultyName ?? undefined,
      deanName,
    })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({
          source: report,
          facultyName,
          deanName,
          url: objectUrl,
          error: false,
        });
      })
      .catch(() => {
        if (active) {
          setPreview({
            source: report,
            facultyName,
            deanName,
            url: "",
            error: true,
          });
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [report, facultyName, deanName]);

  return {
    filename,
    url: current?.url ?? "",
    error: current?.error ?? false,
  };
}
