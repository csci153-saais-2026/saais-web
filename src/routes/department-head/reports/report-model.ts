import type { GradeBand } from "@/components/features/grade-distribution";

export type ReportOption = { value: string; label: string };

export const ALL_PROGRAMS = "all";

/** The slice of a roster row the report needs. */
export type ReportStudent = {
  id: string;
  name: string;
  studentNumber: string;
  programCode: string;
  programName: string;
  curriculum: string;
  entryYear: number | null;
  gwa: number | null;
  deficiencies: number;
};

export type CurriculumSummary = {
  name: string;
  status: "Current" | "Older";
  students: number;
};

export type CohortSummary = {
  id: string;
  entryYear: number;
  curriculum: string;
  students: number;
  meanGwa: string;
  program: string;
};

export type CohortStudent = {
  id: string;
  name: string;
  studentNumber: string;
  curriculum: string;
  gwa: string;
};

export type DepartmentReport = {
  termId: string;
  termLabel: string;
  programKey: string;
  programLabel: string;
  enrolled: number;
  enrolmentNote: string;
  meanGwa: string;
  deficiencies: number;
  /** Students whose cumulative GWA is included in the figures. */
  gwaStudents: number;
  distribution: (GradeBand & { count: number })[];
  curricula: CurriculumSummary[];
  cohorts: CohortSummary[];
};

const BANDS: {
  label: string;
  tone: GradeBand["tone"];
  match: (gwa: number | null) => boolean;
}[] = [
  {
    label: "1.00–1.50",
    tone: "primary",
    match: (gwa) => gwa !== null && gwa <= 1.5,
  },
  {
    label: "1.51–2.25",
    tone: "soft",
    match: (gwa) => gwa !== null && gwa > 1.5 && gwa <= 2.25,
  },
  {
    label: "2.26–3.00",
    tone: "neutral",
    match: (gwa) => gwa !== null && gwa > 2.25 && gwa <= 3,
  },
  {
    label: "Above 3.00",
    tone: "fail",
    match: (gwa) => gwa !== null && gwa > 3,
  },
  { label: "No GWA yet", tone: "inc", match: (gwa) => gwa === null },
];

const mean = (values: number[]) =>
  values.length
    ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)
    : "—";

/** Groups curricula by program, with the newest version of each program first. */
function latestCurriculumFirst(a: string, b: string): number {
  const [codeA, ...restA] = a.split(" "),
    [codeB, ...restB] = b.split(" ");
  return (
    codeA.localeCompare(codeB) ||
    restB.join(" ").localeCompare(restA.join(" "), "en", { numeric: true })
  );
}

/** Builds the department report for a term and program from the live student roster. */
export function buildDepartmentReport(input: {
  students: ReportStudent[];
  currentCurricula: Set<string>;
  termId: string;
  termLabel: string;
  programKey: string;
}): DepartmentReport {
  const { students, currentCurricula, termId, termLabel, programKey } = input;
  const selected =
    programKey === ALL_PROGRAMS
      ? students
      : students.filter((student) => student.programCode === programKey);
  const programLabel =
    programKey === ALL_PROGRAMS
      ? "All department programs"
      : (selected[0]?.programName ?? programKey);
  const withGwa = selected.filter((student) => student.gwa !== null);
  const programCodes = [
    ...new Set(selected.map((student) => student.programCode)),
  ].sort();

  // Largest-remainder rounding keeps the displayed percentages summing to exactly 100.
  const counts = BANDS.map(
    (band) => selected.filter((student) => band.match(student.gwa)).length,
  );
  const exact = counts.map((count) =>
    selected.length ? (count / selected.length) * 100 : 0,
  );
  const percents = exact.map(Math.floor);
  let remainder = selected.length
    ? 100 - percents.reduce((sum, value) => sum + value, 0)
    : 0;
  exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ index }) => {
      if (remainder > 0) {
        percents[index] += 1;
        remainder -= 1;
      }
    });
  const distribution = BANDS.map((band, index) => ({
    label: band.label,
    percent: percents[index],
    count: counts[index],
    tone: band.tone,
    detail: `${counts[index].toLocaleString("en-US")} ${counts[index] === 1 ? "student" : "students"}`,
  }));

  const curricula = [...new Set(selected.map((student) => student.curriculum))]
    .sort(latestCurriculumFirst)
    .map((name) => ({
      name,
      status: currentCurricula.has(name)
        ? ("Current" as const)
        : ("Older" as const),
      students: selected.filter((student) => student.curriculum === name)
        .length,
    }));

  const groups = new Map<string, ReportStudent[]>();
  for (const student of selected) {
    if (student.entryYear === null) continue;
    const key = `${student.entryYear}|${student.curriculum}|${student.programCode}`;
    groups.set(key, [...(groups.get(key) ?? []), student]);
  }
  const cohorts = [...groups]
    .map(([key, members]): CohortSummary => {
      const [entryYear, curriculum, program] = key.split("|");
      return {
        id: `${termId}-${program}-${entryYear}-${curriculum}`,
        entryYear: Number(entryYear),
        curriculum,
        program,
        students: members.length,
        meanGwa: mean(
          members.flatMap((member) =>
            member.gwa === null ? [] : [member.gwa],
          ),
        ),
      };
    })
    .sort(
      (a, b) =>
        b.entryYear - a.entryYear || a.curriculum.localeCompare(b.curriculum),
    );

  return {
    termId,
    termLabel,
    programKey,
    programLabel,
    enrolled: selected.length,
    enrolmentNote:
      programKey === ALL_PROGRAMS
        ? programCodes
            .map(
              (code) =>
                `${code} ${selected.filter((student) => student.programCode === code).length}`,
            )
            .join(" · ")
        : programLabel,
    meanGwa: mean(withGwa.map((student) => student.gwa as number)),
    deficiencies: selected.filter((student) => student.deficiencies > 0).length,
    gwaStudents: withGwa.length,
    distribution,
    curricula,
    cohorts,
  };
}

export function getCohortStudents(
  students: ReportStudent[],
  cohort: CohortSummary,
): CohortStudent[] {
  return students
    .filter(
      (student) =>
        student.entryYear === cohort.entryYear &&
        student.curriculum === cohort.curriculum &&
        student.programCode === cohort.program,
    )
    .map((student) => ({
      id: student.id,
      name: student.name,
      studentNumber: student.studentNumber,
      curriculum: student.curriculum,
      gwa: student.gwa === null ? "—" : student.gwa.toFixed(2),
    }));
}
