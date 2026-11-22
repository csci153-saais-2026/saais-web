import { describe, expect, it, vi } from "vitest";
import { formatChecklistReport } from "./student-report-formatter";
import { createStudentReportPdf } from "./student-report-pdf";

describe("createStudentReportPdf", () => {
  it("generates an institutional PDF blob for a formatted checklist report", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Asset unavailable")),
    );
    try {
      const report = formatChecklistReport({
        studentName: "Maria Isabel Bautista",
        studentNumber: "23-1-04412",
        programLabel: "BS Computer Science",
        curriculumLabel: "2023-2024",
        adviserName: "Prof. Ramon Reyes",
        department: {
          letterhead_prefix: "Office of the Department Head",
          letterhead_name: "Department of Computer Science and Technology",
          department_head_name: "Dr. Elena Cruz",
        },
        sections: [
          {
            title: "Year 1 · Semester 1",
            slots: [
              {
                code: "CSIT 100",
                title: "Introduction to Computing",
                requiredUnits: 3,
                earnedUnits: 3,
                status: "passed",
                finalGrade: 1.5,
              },
            ],
          },
        ],
        earnedUnits: 3,
        requiredUnits: 147,
        generatedOn: "2026-09-19",
      });

      const blob = await createStudentReportPdf(report);
      expect(blob.type).toBe("application/pdf");
      expect(blob.size).toBeGreaterThan(1000);

      const contents = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsText(blob);
      });

      expect(contents).toContain("PROGRAM CHECKLIST");
      expect(contents).toContain("CSIT 100");
      expect(contents).toContain("Prof. Ramon Reyes");
      expect(contents).toContain("Dr. Elena Cruz");
      expect(contents).toContain("Page 1 of 1");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
