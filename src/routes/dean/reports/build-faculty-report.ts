import type { GradeBand } from "@/components/features/grade-distribution";
import type { ApiSchema } from "@/lib/api";
import type {
  BatchCurriculumRow,
  CohortStudentSample,
  FacultyDepartmentReport,
} from "@/routes/dean/types";

function formatDepartmentList(labels: readonly string[]): string {
  if (labels.length === 0) return "Across all faculty departments";
  if (labels.length === 1) return `Across ${labels[0]}`;
  if (labels.length === 2) return `Across ${labels[0]} and ${labels[1]}`;
  return `Across ${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function computeGradeDistribution(
  attempts: ApiSchema<"AttemptResult">[],
  studentIds: Set<string>,
): GradeBand[] {
  const scoped = attempts.filter((a) => studentIds.has(a.student_id));
  const total = scoped.length;
  if (total === 0) {
    return [
      { label: "1.00–1.50", percent: 0, tone: "primary" },
      { label: "1.75–2.25", percent: 0, tone: "soft" },
      { label: "2.50–3.00", percent: 0, tone: "neutral" },
      { label: "5.00", percent: 0, tone: "fail" },
      { label: "INC / DR / NA", percent: 0, tone: "inc" },
    ];
  }

  let band1 = 0;
  let band2 = 0;
  let band3 = 0;
  let band5 = 0;
  let bandInc = 0;

  for (const a of scoped) {
    if (
      a.effective_status === "inc" ||
      a.effective_status === "dr" ||
      a.effective_status === "na" ||
      a.is_lapsed_inc
    ) {
      bandInc += 1;
      continue;
    }
    const g = a.completion_grade ?? a.final_grade;
    if (g == null) continue;
    if (g <= 1.5) band1 += 1;
    else if (g <= 2.25) band2 += 1;
    else if (g <= 3.0) band3 += 1;
    else if (g >= 5.0) band5 += 1;
  }

  const pct = (count: number) => Math.round((count / total) * 100);

  return [
    {
      label: "1.00–1.50",
      percent: pct(band1),
      detail: `${band1} grades`,
      tone: "primary",
    },
    {
      label: "1.75–2.25",
      percent: pct(band2),
      detail: `${band2} grades`,
      tone: "soft",
    },
    {
      label: "2.50–3.00",
      percent: pct(band3),
      detail: `${band3} grades`,
      tone: "neutral",
    },
    {
      label: "5.00",
      percent: pct(band5),
      detail: `${band5} grades`,
      tone: "fail",
    },
    {
      label: "INC / DR / NA",
      percent: pct(bandInc),
      detail: `${bandInc} grades`,
      tone: "inc",
    },
  ];
}

export function buildFacultyDepartmentReport({
  selectedDepartment,
  facultyReport,
  departments,
  rosterItems,
  attemptResults,
}: {
  selectedDepartment: string;
  facultyReport: ApiSchema<"FacultyReport">;
  departments: ApiSchema<"Department">[];
  rosterItems: ApiSchema<"StudentRosterItem">[];
  attemptResults: ApiSchema<"AttemptResult">[];
}): FacultyDepartmentReport {
  const facultyDepartments = departments.filter(
    (d) => d.faculty_id === facultyReport.faculty_id,
  );
  const matchedDept =
    selectedDepartment === "All departments"
      ? null
      : (facultyDepartments.find(
          (d) => d.code === selectedDepartment || d.name === selectedDepartment,
        ) ?? null);

  const scopedStudents = matchedDept
    ? rosterItems.filter((item) => item.department_id === matchedDept.id)
    : rosterItems;

  const studentIds = new Set(scopedStudents.map((s) => s.student_id));
  const summary = matchedDept
    ? facultyReport.department_summaries.find(
        (d) => d.department_id === matchedDept.id,
      )
    : null;

  const gwas = scopedStudents
    .map((s) => s.gwa)
    .filter((g): g is number => typeof g === "number" && Number.isFinite(g));

  const computedMeanGwa =
    summary?.average_gwa != null
      ? summary.average_gwa.toFixed(2)
      : selectedDepartment === "All departments"
        ? facultyReport.average_gwa.toFixed(2)
        : gwas.length
          ? (gwas.reduce((sum, g) => sum + g, 0) / gwas.length).toFixed(2)
          : "0.00";

  const studentsCount =
    summary?.student_count ??
    (selectedDepartment === "All departments"
      ? facultyReport.total_students
      : scopedStudents.length);

  const deficienciesCount =
    selectedDepartment === "All departments"
      ? facultyReport.with_deficiencies_count
      : scopedStudents.filter((s) => s.deficiencies_count > 0).length;

  const batchGroups = new Map<string, ApiSchema<"StudentRosterItem">[]>();
  for (const student of scopedStudents) {
    const key = `${student.entry_year}::${student.curriculum_label}`;
    batchGroups.set(key, [...(batchGroups.get(key) ?? []), student]);
  }

  const batchRows: BatchCurriculumRow[] = [];
  const cohortSamples: Record<string, CohortStudentSample[]> = {};

  for (const [key, group] of batchGroups) {
    const [batch, curriculum] = key.split("::");
    const groupGwas = group
      .map((s) => s.gwa)
      .filter((g): g is number => typeof g === "number" && Number.isFinite(g));
    const meanGwa = groupGwas.length
      ? (groupGwas.reduce((sum, g) => sum + g, 0) / groupGwas.length).toFixed(2)
      : "—";

    batchRows.push({
      batch,
      curriculum,
      students: group.length,
      meanGwa,
    });

    cohortSamples[key] = group.map((s) => ({
      studentId: s.student_id,
      studentNumber: s.student_number,
      name: s.full_name,
      curriculum: s.curriculum_label,
      gwa: typeof s.gwa === "number" ? s.gwa.toFixed(2) : "—",
    }));
  }

  batchRows.sort((a, b) => a.batch.localeCompare(b.batch));

  const departmentSummaryLabel = formatDepartmentList(
    facultyDepartments.map((d) => d.code || d.name).filter(Boolean),
  );

  return {
    department: selectedDepartment,
    departmentCode: matchedDept?.code,
    departmentSummaryLabel,
    students: studentsCount,
    meanGwa: computedMeanGwa,
    withDeficiencies: deficienciesCount,
    bands: computeGradeDistribution(attemptResults, studentIds),
    batchRows,
    cohortSamples,
  };
}
