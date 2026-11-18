import { useQuery } from "@tanstack/react-query"
import { apiClient, unwrapApiResult } from "@/lib/api"
import { getRoster } from "@/routes/adviser/advisees/advisees.api"
import type { ReportOption, ReportStudent } from "./report-model"

export type ReportSource = {
  students: ReportStudent[]
  currentCurricula: Set<string>
  terms: ReportOption[]
  /** The only term the roster snapshot describes. */
  currentTermId: string | null
  programs: ReportOption[]
}

async function getReportSource(): Promise<ReportSource> {
  const [roster, versions, schoolTerms] = await Promise.all([
    getRoster("all"),
    apiClient.GET("/rest/v1/curriculum_version", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
    apiClient.GET("/rest/v1/school_term", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
  ])
  const ordered = [...schoolTerms].sort((a, b) => b.chronological_key - a.chronological_key)
  const current = ordered.find((term) => !term.is_locked) ?? ordered[0]
  const programs = new Map<string, string>()
  for (const student of roster) programs.set(student.program_code, student.program_name)
  return {
    students: roster.map((student) => ({
      id: student.student_id, name: student.full_name, studentNumber: student.student_number,
      programCode: student.program_code, programName: student.program_name, curriculum: student.curriculum_label,
      entryYear: student.entry_year ?? null, gwa: student.gwa ?? null, deficiencies: student.deficiencies_count,
    })),
    currentCurricula: new Set(versions.filter((version) => version.status === "active").map((version) => version.version_label)),
    terms: ordered.map((term) => ({ value: term.id, label: `AY ${term.start_year}–${term.end_year} · ${term.term_type.replace(" Semester", " semester")}` })),
    currentTermId: current?.id ?? null,
    programs: [...programs].sort(([a], [b]) => a.localeCompare(b)).map(([value, label]) => ({ value, label })),
  }
}

export const useReportSource = () => useQuery({ queryKey: ["department-head", "report-source"], queryFn: getReportSource })
