import type { PdfReportPayload } from "./student-report-formatter";

const GREEN = "#29450e";
const CREAM = "#f8f6ed";
const STATS_BG = "#eef2eb";

function cleanPdfText(value: string): string {
  return value.replace(/[–—]/g, "-").replace(/·/g, "|");
}

async function loadPublicPng(name: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${name}`);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function computeColumnPositions(
  headers: readonly string[],
  margin: number,
  contentWidth: number,
): { starts: number[]; widths: number[]; numericFlags: boolean[] } {
  const count = headers.length;
  if (count === 5 && headers[0] === "Code" && headers[1] === "Title") {
    // Program checklist: Code, Title, Units, Grade, Status
    const widths = [26, contentWidth - 96, 16, 22, 32];
    const starts: number[] = [];
    let x = margin + 3;
    for (let i = 0; i < widths.length; i += 1) {
      starts.push(x);
      x += widths[i];
    }
    return {
      starts,
      widths,
      numericFlags: [false, false, true, true, false],
    };
  }

  if (count === 6 && headers[0] === "Code" && headers[1] === "Title") {
    // Grade summary: Code, Title, Units, Midterm, Final / completion, Status
    const widths = [24, contentWidth - 110, 14, 20, 28, 24];
    const starts: number[] = [];
    let x = margin + 3;
    for (let i = 0; i < widths.length; i += 1) {
      starts.push(x);
      x += widths[i];
    }
    return {
      starts,
      widths,
      numericFlags: [false, false, true, true, true, false],
    };
  }

  const colWidth = (contentWidth - 6) / Math.max(count, 1);
  const starts = headers.map((_, i) => margin + 3 + i * colWidth);
  const widths = headers.map(() => colWidth);
  return {
    starts,
    widths,
    numericFlags: headers.map(() => false),
  };
}

/**
 * Generates an institutional A4 PDF Blob from a `PdfReportPayload`,
 * matching the VSU letterhead, green/cream palette, tables, signatories, and footer.
 */
export async function createStudentReportPdf(
  report: PdfReportPayload,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const text = (
    value: string,
    x: number,
    y: number,
    options?: Parameters<typeof pdf.text>[3],
  ) => pdf.text(cleanPdfText(value), x, y, options);

  const topStripe = () => {
    pdf.setFillColor(GREEN);
    pdf.rect(0, 0, pageWidth, 2, "F");
  };

  topStripe();

  const logos = await Promise.all([
    loadPublicPng("bagong-pilipinas.png"),
    loadPublicPng("vsu-wordmark.png"),
  ]);
  if (logos[0]) pdf.addImage(logos[0], "PNG", margin, 10, 22, 21);
  if (logos[1]) pdf.addImage(logos[1], "PNG", margin + 25, 10, 60, 21);

  const dividerX = margin + 90;
  pdf.setDrawColor(GREEN);
  pdf.line(dividerX, 10, dividerX, 31);

  pdf.setTextColor(GREEN);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  text(report.unit.prefix, dividerX + 5, 16);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  const unitLines = pdf.splitTextToSize(
    cleanPdfText(report.unit.name),
    pageWidth - (dividerX + 5) - margin,
  ) as string[];
  pdf.text(unitLines, dividerX + 5, 22.5);

  pdf.setTextColor("#111111");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  text(report.title.toUpperCase(), pageWidth / 2, 40, { align: "center" });

  let y = 46;

  if (report.info.length > 0) {
    const cols = 2;
    const rowsCount = Math.ceil(report.info.length / cols);
    const boxHeight = rowsCount * 6 + 4;
    pdf.setFillColor(CREAM);
    pdf.setDrawColor("#dcd9ce");
    pdf.rect(margin, y, contentWidth, boxHeight, "FD");

    const colWidth = (contentWidth - 6) / cols;
    report.info.forEach(([label, value], idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = margin + 3 + col * colWidth;
      const rowY = y + 6 + row * 6;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor("#555555");
      const labelText = `${cleanPdfText(label)}:`;
      pdf.text(labelText, x, rowY);

      const labelWidth = pdf.getTextWidth(labelText) + 1.5;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor("#111111");
      const valueLines = pdf.splitTextToSize(
        cleanPdfText(value),
        colWidth - labelWidth - 3,
      ) as string[];
      pdf.text(valueLines[0] ?? "", x + labelWidth, rowY);
    });

    y += boxHeight + 4;
  }

  if (report.stats.length > 0) {
    pdf.setFillColor(STATS_BG);
    pdf.rect(margin, y, contentWidth, 8.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(GREEN);
    const statsText = report.stats
      .map(
        (stat) =>
          `${stat.label.toUpperCase()}: ${stat.value}${stat.note ? ` (${stat.note})` : ""}`,
      )
      .join("   |   ");
    text(statsText, margin + 3, y + 5.7);
    y += 13;
  }

  for (const section of report.sections) {
    if (y > pageHeight - 32) {
      pdf.addPage();
      topStripe();
      y = 14;
    }

    pdf.setTextColor("#111111");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    text(section.title, margin, y);
    y += 4;

    const { starts, widths } = computeColumnPositions(
      section.headers,
      margin,
      contentWidth,
    );

    const drawHeader = () => {
      pdf.setFillColor(GREEN);
      pdf.rect(margin, y, contentWidth, 8, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      section.headers.forEach((header, index) => {
        text(header.toUpperCase(), starts[index], y + 5.3);
      });
      pdf.setTextColor("#111111");
      y += 8;
    };

    drawHeader();

    section.rows.forEach((row, rowIndex) => {
      const wrappedCells = section.headers.map((_, colIndex) => {
        const cell = cleanPdfText(row[colIndex] || "-");
        return pdf.splitTextToSize(
          cell,
          Math.max(widths[colIndex] - 3, 8),
        ) as string[];
      });
      const maxLines = Math.max(
        1,
        ...wrappedCells.map((lines) => lines.length),
      );
      const rowHeight = maxLines * 4.2 + 3.2;

      if (y + rowHeight > pageHeight - 18) {
        pdf.addPage();
        topStripe();
        y = 14;
        drawHeader();
      }

      if (rowIndex % 2 === 1) {
        pdf.setFillColor(CREAM);
        pdf.rect(margin, y, contentWidth, rowHeight, "F");
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.8);
      pdf.setTextColor("#111111");
      wrappedCells.forEach((lines, colIndex) => {
        pdf.text(lines, starts[colIndex], y + 4.8);
      });

      y += rowHeight;
    });

    y += 7;
  }

  if (report.signatories.length > 0) {
    if (y > pageHeight - 36) {
      pdf.addPage();
      topStripe();
      y = 18;
    } else {
      y += 6;
    }

    const sigWidth = 68;
    const leftCenter = margin + contentWidth * 0.25;
    const rightCenter = margin + contentWidth * 0.75;
    const centers =
      report.signatories.length === 1
        ? [margin + contentWidth * 0.5]
        : [leftCenter, rightCenter];

    report.signatories.forEach((sig, index) => {
      const centerX = centers[index] ?? leftCenter;
      pdf.setDrawColor("#888888");
      pdf.line(centerX - sigWidth / 2, y, centerX + sigWidth / 2, y);

      if (sig.name) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor("#111111");
        text(sig.name, centerX, y + 5, { align: "center" });
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor("#555555");
      text(sig.role, centerX, y + (sig.name ? 9.5 : 5), { align: "center" });
    });
  }

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor("#666666");
    text(report.footer, margin, pageHeight - 7);
    text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    });
  }

  return pdf.output("blob");
}
