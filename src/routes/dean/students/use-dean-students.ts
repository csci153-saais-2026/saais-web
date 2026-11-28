import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDeanAuditLogEntries } from "@/routes/dean/audit-log/audit-log.api";
import { useDeanFaculty } from "@/routes/dean/shared/use-dean-faculty";
import {
  getDeanCourseOfferings,
  getDeanCourses,
  getDeanStudentChecklist,
  getDeanStudentGrades,
  getDeanStudents,
} from "@/routes/dean/students/students.api";
import { toDeanStudentSummary } from "@/routes/dean/students/to-dean-student-summary";

export function useDeanStudents() {
  const rosterQuery = useQuery({
    queryKey: ["dean", "students"],
    queryFn: ({ signal }) => getDeanStudents(signal),
  });

  const facultyQuery = useDeanFaculty(rosterQuery.data?.items[0]?.faculty_id);

  const students = useMemo(
    () => (rosterQuery.data?.items ?? []).map(toDeanStudentSummary),
    [rosterQuery.data],
  );

  const isLoading = rosterQuery.isLoading || facultyQuery.isLoading;
  const isError = rosterQuery.isError || facultyQuery.isError;
  const isFacultyUnavailable =
    !isLoading && !isError && !facultyQuery.facultyName;

  const refetch = () => {
    void Promise.all([rosterQuery.refetch(), facultyQuery.refetch()]);
  };

  return {
    students,
    hasData: Boolean(rosterQuery.data),
    facultyName: facultyQuery.facultyName,
    isLoading,
    isError,
    isFacultyUnavailable,
    refetch,
  };
}

export function useDeanStudentChecklist(studentId: string) {
  return useQuery({
    queryKey: ["dean", "student-checklist", studentId],
    queryFn: ({ signal }) => getDeanStudentChecklist(studentId, signal),
  });
}

export function useDeanStudentGrades(studentId: string) {
  return useQuery({
    queryKey: ["dean", "student-grades", studentId],
    queryFn: async ({ signal }) => {
      const termGrades = await getDeanStudentGrades(studentId, signal);
      const offerings = await getDeanCourseOfferings(
        termGrades.flatMap((term) =>
          term.attempts.map((attempt) => attempt.course_offering_id),
        ),
        signal,
      );
      const courses = await getDeanCourses(
        offerings.map((offering) => offering.course_id),
        signal,
      );
      return { termGrades, courses, offerings };
    },
  });
}

export function useDeanStudentAudit(studentId: string, studentNumber: string) {
  return useQuery({
    queryKey: ["dean", "audit-log", "student", studentId, studentNumber],
    queryFn: ({ signal }) =>
      getDeanAuditLogEntries(signal, { id: studentId, number: studentNumber }),
  });
}
