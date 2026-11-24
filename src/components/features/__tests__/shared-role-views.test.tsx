import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CohortGwaTable } from "@/components/features/cohort-gwa-table";
import { ChecklistView } from "@/components/features/checklist-view";
import { GradesView } from "@/components/features/grades-view";
import { ReportStatsSection } from "@/components/features/report-stats-section";

afterEach(cleanup);

const row = {
  code: "CSIT 100",
  title: "Introduction to Computing",
  unitsEarned: 3,
  unitsRequired: 3,
  status: "passed" as const,
  source: "Direct",
  attempts: 1,
};

describe("ChecklistView", () => {
  const terms = [
    {
      id: "t1",
      title: "Year 1 · Semester 1",
      passedUnits: 3,
      totalUnits: 3,
      semesterGwa: "1.56",
      rows: [row],
    },
  ];

  it("renders tiles, term groups and routes Course info with the term id", () => {
    const onCourseInfo = vi.fn();
    render(
      <ChecklistView
        stats={[{ label: "Cumulative GWA", value: "1.58" }]}
        terms={terms}
        onCourseInfo={onCourseInfo}
      />,
    );
    expect(screen.getByText("Cumulative GWA")).toBeTruthy();
    expect(screen.getByText("Year 1 · Semester 1")).toBeTruthy();
    expect(screen.getByText("1.56")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Course info" }));
    expect(onCourseInfo).toHaveBeenCalledWith("t1", "CSIT 100");
  });

  it("toggles Collapse all / Expand all", () => {
    render(<ChecklistView terms={terms} />);
    expect(screen.getByText("Introduction to Computing")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByText("Introduction to Computing")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByText("Introduction to Computing")).toBeTruthy();
  });

  it("shows the empty state and omits the filter when none is given", () => {
    render(<ChecklistView terms={[]} />);
    expect(screen.getByText("No matching requirements")).toBeTruthy();
    expect(screen.queryByText("Show requirements")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Collapse all",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows the status filter when provided", () => {
    render(
      <ChecklistView
        terms={terms}
        filter={{ value: "all", onChange: () => undefined }}
      />,
    );
    expect(screen.getByText("Show requirements")).toBeTruthy();
  });
});

describe("GradesView", () => {
  const terms = [
    {
      id: "g1",
      title: "2025–2026 · 1st Semester",
      gwa: "1.75",
      failedUnits: 3,
      locked: true,
      rows: [
        {
          id: "a1",
          code: "CSci 102",
          title: "Data Structures",
          units: 3,
          midterm: "2.50",
          final: "INC",
          status: "inc" as const,
          statusNote: "Due 12 Mar 2026",
        },
      ],
    },
  ];

  it("renders the term summary, labelled cells and the status note", () => {
    render(<GradesView terms={terms} />);
    expect(screen.getByText("2025–2026 · 1st Semester")).toBeTruthy();
    expect(
      screen.getByText(/Term GWA 1.75 · 3 failed units · Locked term/),
    ).toBeTruthy();
    expect(screen.getByText("Due 12 Mar 2026")).toBeTruthy();
    const labels = Array.from(document.querySelectorAll("td")).map((cell) =>
      cell.getAttribute("data-label"),
    );
    expect(labels).toEqual([
      "Course",
      "Units",
      "Midterm",
      "Final / completion",
      "Status",
    ]);
  });

  it("renders the row action column only when rowAction is provided", () => {
    const render1 = vi.fn(() => <button>Flag Grade</button>);
    render(
      <GradesView
        terms={terms}
        rowAction={{ header: "Flag", render: render1 }}
      />,
    );
    expect(screen.getByRole("button", { name: "Flag Grade" })).toBeTruthy();
    expect(render1).toHaveBeenCalledWith(terms[0].rows[0], terms[0]);
    expect(screen.getByText("Flag")).toBeTruthy();
  });

  it("collapses all terms and shows the empty state with no terms", () => {
    const { unmount } = render(<GradesView terms={terms} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByText("Data Structures")).toBeNull();
    unmount();

    render(<GradesView terms={[]} />);
    expect(
      screen.getByText("No academic term grades recorded yet."),
    ).toBeTruthy();
  });
});

describe("ReportStatsSection", () => {
  const bands = [
    { label: "1.00–1.50", percent: 34 },
    { label: "5.00", percent: 4, tone: "fail" as const },
  ];

  it("renders tiles, the distribution and a clickable tile", () => {
    const onSelect = vi.fn();
    render(
      <ReportStatsSection
        stats={[
          { label: "Students", value: 5 },
          { label: "With deficiencies", value: 4, onSelect },
        ]}
        distribution={{
          title: "Final grade distribution",
          bands,
          footnote: "Percentages sum to 100%.",
        }}
      />,
    );
    expect(screen.getByText("Final grade distribution")).toBeTruthy();
    expect(screen.getByText("34%")).toBeTruthy();
    expect(screen.getByText("Percentages sum to 100%.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /With deficiencies/ }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /Students/ })).toBeNull();
  });

  it("renders the empty message when there are no bands", () => {
    render(
      <ReportStatsSection
        stats={[]}
        distribution={{ title: "Distribution", bands: [] }}
      />,
    );
    expect(
      screen.getByText("Grade distribution is not available."),
    ).toBeTruthy();
  });
});

describe("CohortGwaTable", () => {
  const rows = [
    {
      id: "c1",
      entryYear: 2025,
      studyRange: "2025–2029",
      curriculum: "BSCS 2024-2025 v1",
      students: 28,
      meanGwa: "1.92",
    },
  ];

  it("renders labelled cells, the footer and routes View students with the row", () => {
    const onViewStudents = vi.fn();
    render(
      <CohortGwaTable
        rows={rows}
        onViewStudents={onViewStudents}
        footer="1 cohort · All department programs"
      />,
    );
    expect(screen.getByText("Study range")).toBeTruthy();
    expect(screen.getByText("2025–2029")).toBeTruthy();
    expect(screen.getByText("1 cohort · All department programs")).toBeTruthy();
    const labels = Array.from(document.querySelectorAll("td")).map((cell) =>
      cell.getAttribute("data-label"),
    );
    expect(labels).toEqual([
      "Entry year",
      "Study range",
      "Curriculum",
      "Students",
      "Mean GWA",
      "Actions",
    ]);
    fireEvent.click(
      screen.getByRole("button", {
        name: "View students for BSCS 2024-2025 v1 batch 2025",
      }),
    );
    expect(onViewStudents).toHaveBeenCalledWith(rows[0]);
  });

  it("hides Study range and the action column when not provided", () => {
    render(<CohortGwaTable rows={[{ ...rows[0], studyRange: undefined }]} />);
    expect(screen.queryByText("Study range")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the empty message", () => {
    render(<CohortGwaTable rows={[]} emptyMessage="No cohorts." />);
    expect(screen.getByText("No cohorts.")).toBeTruthy();
  });
});
