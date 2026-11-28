import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { postDeanAuditViewEvent } from "@/routes/dean/audit-log/audit-log.api";
import { buildFacultyDepartmentReport } from "@/routes/dean/reports/build-faculty-report";
import {
  getDeanAttemptResults,
  getFacultyDepartments,
  getFacultyReport,
} from "@/routes/dean/reports/reports.api";
import { useDeanFaculty } from "@/routes/dean/shared/use-dean-faculty";
import { getDeanStudents } from "@/routes/dean/students/students.api";
import type { DepartmentFilter } from "@/routes/dean/types";

export function useDeanReports(department: DepartmentFilter) {
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ["dean", "faculty-report"],
    queryFn: async ({ signal }) => {
      const [facultyReport, departments] = await Promise.all([
        getFacultyReport(signal),
        getFacultyDepartments(signal),
      ]);
      const roster = await getDeanStudents(signal, facultyReport.faculty_id);
      return { facultyReport, departments, roster };
    },
  });

  const facultyQuery = useDeanFaculty(
    reportsQuery.data?.facultyReport.faculty_id,
  );

  const facultyDepartments = useMemo(() => {
    const data = reportsQuery.data;
    return data
      ? data.departments.filter(
          (d) => d.faculty_id === data.facultyReport.faculty_id,
        )
      : [];
  }, [reportsQuery.data]);
  const departmentOptions = [
    "All departments",
    ...facultyDepartments.map((d) => d.code || d.name),
  ];
  const departmentId = facultyDepartments.find(
    (d) => department === d.code || department === d.name,
  )?.id;
  const studentIds = useMemo(
    () =>
      (reportsQuery.data?.roster.items ?? [])
        .filter(
          (student) => !departmentId || student.department_id === departmentId,
        )
        .map((student) => student.student_id),
    [departmentId, reportsQuery.data],
  );
  const attemptsQuery = useQuery({
    queryKey: ["dean", "faculty-report", "attempts", studentIds],
    queryFn: ({ signal }) => getDeanAttemptResults(studentIds, signal),
    enabled: Boolean(reportsQuery.data),
  });

  const report = useMemo(() => {
    if (!reportsQuery.data || !facultyQuery.facultyName || !attemptsQuery.data)
      return null;
    return buildFacultyDepartmentReport({
      selectedDepartment: department,
      facultyReport: reportsQuery.data.facultyReport,
      departments: reportsQuery.data.departments,
      rosterItems: reportsQuery.data.roster.items,
      attemptResults: attemptsQuery.data,
    });
  }, [
    reportsQuery.data,
    facultyQuery.facultyName,
    department,
    attemptsQuery.data,
  ]);

  const recordView = (
    eventType: "report_viewed" | "pdf_exported",
    details: string,
  ) => {
    void postDeanAuditViewEvent({
      event_type: eventType,
      report_type: "faculty",
      details,
    })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["dean", "audit-log"] }),
      )
      .catch(() => undefined);
  };

  const isLoading =
    reportsQuery.isLoading || facultyQuery.isLoading || attemptsQuery.isLoading;
  const isError =
    reportsQuery.isError || facultyQuery.isError || attemptsQuery.isError;
  const isFacultyUnavailable =
    !isLoading && !isError && !facultyQuery.facultyName;

  const refetch = () => {
    void Promise.all([
      reportsQuery.refetch(),
      facultyQuery.refetch(),
      ...(reportsQuery.data ? [attemptsQuery.refetch()] : []),
    ]);
  };

  return {
    report,
    rosterItems: reportsQuery.data?.roster.items ?? [],
    facultyName: facultyQuery.facultyName,
    departmentOptions,
    isLoading,
    isError,
    isFacultyUnavailable,
    refetch,
    recordView,
  };
}
