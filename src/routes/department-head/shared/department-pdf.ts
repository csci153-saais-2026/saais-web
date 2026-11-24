import type { ApiSchema } from "@/lib/api";

/** A department-head export, described as data so every page shares one PDF layout. */
export type DepartmentPdfSection = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  /** Relative column widths; defaults to equal columns. */
  weights?: number[];
  /** Column indexes to right-align, such as counts and GWA values. */
  rightAlign?: number[];
  note?: string;
};

export type DepartmentPdfDocument = {
  title: string;
  subtitle: string;
  filename: string;
  stats?: { label: string; value: string | number; note?: string }[];
  sections: DepartmentPdfSection[];
};

const LOGOS = ["bagong-pilipinas.png", "vsu-wordmark.png", "FC.png", "DCST.png"] as const;
const GREEN = "#29450e";
const CREAM = "#f8f6ed";

// The standard PDF fonts only cover Latin-1, so typographic punctuation is flattened.
const clean = (value: string | number) =>
  String(value)
    .replace(/[–—]/g, "-")
    .replace(/·/g, "|")
    .replace(/→/g, "->")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replaceAll(String.fromCharCode(160), " ");

async function loadLogo(name: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${name}`);
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Builds the PDF with the institutional logos from public/. */
export async function createDepartmentPdf(
  report: DepartmentPdfDocument,
  department?: ApiSchema<"Department">,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logos = await Promise.all(LOGOS.map(loadLogo));
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const bodyWidth = pageWidth - margin * 2;
  let y = 0;

  const text = (
    value: string | number,
    x: number,
    top: number,
    options?: Parameters<typeof pdf.text>[3],
  ) => pdf.text(clean(value), x, top, options);
  const stripe = () => {
    pdf.setFillColor(GREEN);
    pdf.rect(0, 0, pageWidth, 2, "F");
  };
  const ink = () => pdf.setTextColor("#111111");

  // Same letterhead as the adviser dashboard: two logos, a divider, then the department name.
  function letterhead() {
    stripe();
    const [bagong, vsu, fc, dcst] = logos;
    if (bagong) pdf.addImage(bagong, "PNG", margin, 12, 17, 17);
    if (vsu) pdf.addImage(vsu, "PNG", margin + 20, 12, 48, 17);
    if (fc) pdf.addImage(fc, "PNG", pageWidth - margin - 40, 10, 18, 21);
    if (dcst) pdf.addImage(dcst, "PNG", pageWidth - margin - 20, 10, 20, 21);
    const dividerX = margin + 72;
    pdf.setDrawColor(GREEN);
    pdf.line(dividerX, 10, dividerX, 31);
    pdf.setTextColor(GREEN);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    text(department?.letterhead_prefix ?? "Department", dividerX + 4, 17);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(
      pdf.splitTextToSize(
        clean(
          department?.letterhead_name ??
            department?.name ??
            "Department unavailable",
        ),
        pageWidth - margin - 43 - (dividerX + 4),
      ) as string[],
      dividerX + 4,
      24,
    );
    ink();
  }

  function ensure(space: number) {
    if (y + space <= pageHeight - 16) return false;
    pdf.addPage();
    stripe();
    y = 16;
    return true;
  }

  letterhead();
  ink();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  text(report.title.toUpperCase(), pageWidth / 2, 44, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  text(report.subtitle, pageWidth / 2, 50, { align: "center" });
  y = 58;

  if (report.stats?.length) {
    const gap = 3,
      width =
        (bodyWidth - gap * (report.stats.length - 1)) / report.stats.length;
    report.stats.forEach((stat, index) => {
      const x = margin + index * (width + gap);
      pdf.setFillColor("#eef2eb");
      pdf.rect(x, y, width, 19, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      text(stat.label.toUpperCase(), x + 3, y + 5);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      text(stat.value, x + 3, y + 12);
      if (stat.note) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        text(
          (pdf.splitTextToSize(clean(stat.note), width - 6) as string[])[0],
          x + 3,
          y + 16.5,
        );
      }
    });
    y += 27;
  }

  for (const section of report.sections) {
    const weights = section.weights ?? section.headers.map(() => 1);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const widths = weights.map((weight) => (bodyWidth * weight) / total);
    const right = new Set(section.rightAlign ?? []);
    const heading = (suffix = "") => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10.5);
      ink();
      text(section.title + suffix, margin, y);
      y += 4;
    };
    const header = () => {
      pdf.setFillColor(GREEN);
      pdf.rect(margin, y, bodyWidth, 7, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      let x = margin;
      section.headers.forEach((value, column) => {
        if (right.has(column))
          text(value, x + widths[column] - 3, y + 4.8, { align: "right" });
        else text(value, x + 3, y + 4.8);
        x += widths[column];
      });
      ink();
      y += 7;
    };
    ensure(30);
    heading();
    header();
    section.rows.forEach((row, index) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const cells = section.headers.map(
        (_, column) =>
          pdf.splitTextToSize(
            clean(row[column] ?? "-"),
            widths[column] - 6,
          ) as string[],
      );
      const height = Math.max(...cells.map((lines) => lines.length)) * 4 + 3.5;
      if (ensure(height + 8)) {
        heading(" (continued)");
        header();
      }
      if (index % 2 === 1) {
        pdf.setFillColor(CREAM);
        pdf.rect(margin, y, bodyWidth, height, "F");
      }
      let x = margin;
      cells.forEach((lines, column) => {
        if (right.has(column))
          pdf.text(lines, x + widths[column] - 3, y + 4.6, { align: "right" });
        else pdf.text(lines, x + 3, y + 4.6);
        x += widths[column];
      });
      y += height;
    });
    y += 3;
    if (section.note) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      ink();
      text(section.note, margin, y + 2);
      y += 6;
    }
    y += 6;
  }

  ensure(36);
  pdf.setDrawColor("#888888");
  pdf.line(margin + 10, y + 16, margin + 75, y + 16);
  pdf.line(pageWidth - margin - 75, y + 16, pageWidth - margin - 10, y + 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  if (department?.department_head_name)
    text(department.department_head_name, margin + 42.5, y + 21, {
      align: "center",
    });
  if (department?.dean_name)
    text(department.dean_name, pageWidth - margin - 42.5, y + 21, {
      align: "center",
    });
  pdf.setFont("helvetica", "normal");
  text("Prepared by: Department Head", margin + 42.5, y + 26, {
    align: "center",
  });
  text("Noted by: Dean", pageWidth - margin - 42.5, y + 26, {
    align: "center",
  });

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor("#666666");
    text(
      `Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} through SAAIS`,
      margin,
      pageHeight - 7,
    );
    text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    });
  }
  return pdf.output("blob");
}
