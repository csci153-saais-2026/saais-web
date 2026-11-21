import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { postDeanAuditViewEvent } from "@/routes/dean/audit-log/audit-log.api"
import { buildFacultyDepartmentReport } from "@/routes/dean/reports/build-faculty-report"
import {
  getDeanAttemptResults,
  getFacultyDepartments,
  getFacultyReport,
} from "@/routes/dean/reports/reports.api"
import { useDeanFaculty } from "@/routes/dean/shared/use-dean-faculty"
import { getDeanStudents } from "@/routes/dean/students/students.api"
import type { DepartmentFilter } from "@/routes/dean/types"

export function useDeanReports(department: DepartmentFilter) {
  const queryClient = useQueryClient()

  const reportsQuery = useQuery({
    queryKey: ["dean", "faculty-report"],
    queryFn: async ({ signal }) => {
      const [facultyReport, departments, roster, attemptResults] = await Promise.all([
        getFacultyReport(signal),
        getFacultyDepartments(signal),
        getDeanStudents(signal),
        getDeanAttemptResults(signal),
      ])
      return { facultyReport, departments, roster, attemptResults }
    },
  })

  const facultyQuery = useDeanFaculty(reportsQuery.data?.facultyReport.faculty_id)

  const departmentOptions = useMemo(() => {
    const depts = reportsQuery.data?.departments ?? []
    const facultyId = reportsQuery.data?.facultyReport.faculty_id
    const scoped = facultyId ? depts.filter((d) => d.faculty_id === facultyId) : depts
    return ["All departments", ...scoped.map((d) => d.code || d.name)]
  }, [reportsQuery.data])

  const report = useMemo(() => {
    if (!reportsQuery.data || !facultyQuery.facultyName) return null
    return buildFacultyDepartmentReport({
      selectedDepartment: department,
      facultyReport: reportsQuery.data.facultyReport,
      departments: reportsQuery.data.departments,
      rosterItems: reportsQuery.data.roster.items,
      attemptResults: reportsQuery.data.attemptResults,
    })
  }, [reportsQuery.data, facultyQuery.facultyName, department])

  const recordView = (
    eventType: "report_viewed" | "pdf_exported",
    details: string,
  ) => {
    void postDeanAuditViewEvent({
      event_type: eventType,
      report_type: "faculty",
      details,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["dean", "audit-log"] }))
      .catch(() => undefined)
  }

  const isLoading = reportsQuery.isLoading || facultyQuery.isLoading
  const isError = reportsQuery.isError || facultyQuery.isError
  const isFacultyUnavailable = !isLoading && !isError && !facultyQuery.facultyName

  const refetch = () => {
    void Promise.all([reportsQuery.refetch(), facultyQuery.refetch()])
  }

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
  }
}
