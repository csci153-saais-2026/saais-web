import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFacultyReportPdf } from "@/routes/dean/reports/faculty-report-pdf";
import { useFacultyReportPdfPreview } from "@/routes/dean/reports/use-faculty-report-pdf";
import type { FacultyDepartmentReport } from "@/routes/dean/types";

vi.mock("@/routes/dean/reports/faculty-report-pdf", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/routes/dean/reports/faculty-report-pdf")
    >();
  return {
    ...actual,
    createFacultyReportPdf: vi.fn(),
  };
});

const REPORT_ALL: FacultyDepartmentReport = {
  department: "All departments",
  students: 120,
  meanGwa: "1.90",
  withDeficiencies: 8,
  bands: [],
  batchRows: [],
  cohortSamples: {},
};

const REPORT_DCST: FacultyDepartmentReport = {
  ...REPORT_ALL,
  department: "DCST",
  students: 60,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useFacultyReportPdfPreview", () => {
  const mockedCreatePdf = vi.mocked(createFacultyReportPdf);
  let urlCounter = 0;

  beforeEach(() => {
    urlCounter = 0;
    mockedCreatePdf.mockReset();
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      () => `blob:faculty-report-${++urlCounter}`,
    );
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays idle when report is null and builds object URL when ready", async () => {
    mockedCreatePdf.mockResolvedValueOnce(new Blob(["pdf"]));

    const { result, rerender } = renderHook(
      ({ report }: { report: FacultyDepartmentReport | null }) =>
        useFacultyReportPdfPreview({
          report,
          facultyName: "Faculty of Computing",
          deanName: "Dr. Paz Villanueva",
        }),
      { initialProps: { report: null as FacultyDepartmentReport | null } },
    );

    expect(result.current).toEqual({
      filename: "",
      url: "",
      error: false,
    });
    expect(mockedCreatePdf).not.toHaveBeenCalled();

    rerender({ report: REPORT_ALL });

    expect(result.current.filename).toBe("SAAIS-faculty-reports.pdf");
    await waitFor(() => {
      expect(result.current.url).toBe("blob:faculty-report-1");
    });
    expect(result.current.error).toBe(false);
    expect(mockedCreatePdf).toHaveBeenCalledWith(REPORT_ALL, {
      facultyName: "Faculty of Computing",
      deanName: "Dr. Paz Villanueva",
    });
  });

  it("sets error state when PDF creation fails", async () => {
    mockedCreatePdf.mockRejectedValueOnce(new Error("jsPDF failed"));

    const { result } = renderHook(() =>
      useFacultyReportPdfPreview({
        report: REPORT_DCST,
        facultyName: "Faculty of Computing",
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });
    expect(result.current.url).toBe("");
    expect(result.current.filename).toBe("SAAIS-faculty-reports-dcst.pdf");
  });

  it("ignores stale PDF results when report changes before previous promise settles", async () => {
    const first = deferred<Blob>();
    const second = deferred<Blob>();
    mockedCreatePdf
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(
      ({ report }: { report: FacultyDepartmentReport | null }) =>
        useFacultyReportPdfPreview({
          report,
          facultyName: "Faculty of Computing",
        }),
      { initialProps: { report: REPORT_ALL } },
    );

    rerender({ report: REPORT_DCST });
    expect(result.current.url).toBe("");
    expect(result.current.filename).toBe("SAAIS-faculty-reports-dcst.pdf");

    await act(async () => {
      second.resolve(new Blob(["dcst"]));
      await second.promise;
    });

    expect(result.current.url).toBe("blob:faculty-report-1");

    await act(async () => {
      first.resolve(new Blob(["stale-all"]));
      await first.promise;
    });

    expect(result.current.url).toBe("blob:faculty-report-1");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("revokes object URL when closed and on unmount", async () => {
    mockedCreatePdf
      .mockResolvedValueOnce(new Blob(["pdf-1"]))
      .mockResolvedValueOnce(new Blob(["pdf-2"]));

    const { result, rerender, unmount } = renderHook(
      ({ report }: { report: FacultyDepartmentReport | null }) =>
        useFacultyReportPdfPreview({
          report,
          facultyName: "Faculty of Computing",
        }),
      {
        initialProps: { report: REPORT_ALL as FacultyDepartmentReport | null },
      },
    );

    await waitFor(() => {
      expect(result.current.url).toBe("blob:faculty-report-1");
    });

    rerender({ report: null });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:faculty-report-1");
    expect(result.current).toEqual({ filename: "", url: "", error: false });

    rerender({ report: REPORT_DCST });
    await waitFor(() => {
      expect(result.current.url).toBe("blob:faculty-report-2");
    });

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:faculty-report-2");
  });
});
