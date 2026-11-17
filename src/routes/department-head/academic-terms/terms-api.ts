import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"
import { formatDisplayDate, formatTermDateRange } from "../shared/dh-utils"

export type AcademicTermRecord = {
  id: string
  academicYear: string
  semester: string
  termDates: string
  encodingDeadline: string
  status: "Open" | "Closed"
  closedBy?: string
  closureNote?: string
  startDate?: string
  endDate?: string
}

export type NewTerm = {
  academicYear: string
  semester: string
  startDate: string
  endDate: string
  deadline: string
  closed: boolean
}

const SEMESTER_TO_API: Record<string, ApiSchema<"SchoolTermType">> = {
  "1st semester": "1st Semester", "2nd semester": "2nd Semester", Midyear: "Summer",
}
const SEMESTER_LABEL: Record<ApiSchema<"SchoolTermType">, string> = {
  "1st Semester": "1st semester", "2nd Semester": "2nd semester", Summer: "Midyear",
}

const KEY = ["department-head", "terms"] as const

async function getAcademicTerms(): Promise<AcademicTermRecord[]> {
  const [terms, closures] = await Promise.all([
    apiClient.GET("/rest/v1/school_term", { params: { query: { select: "*", order: "chronological_key.desc", limit: 100 } } }).then(unwrapApiResult),
    apiClient.GET("/rest/v1/department_term_encoding", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
  ])
  return terms.map((term) => {
    const closure = closures.find((row) => row.school_term_id === term.id && row.is_closed)
    const closed = Boolean(closure) || term.is_locked
    return {
      id: term.id,
      academicYear: `${term.start_year}–${term.end_year}`,
      semester: SEMESTER_LABEL[term.term_type],
      termDates: term.starts_on ? formatTermDateRange(term.starts_on, term.ends_on) : formatDisplayDate(term.ends_on),
      encodingDeadline: term.encoding_deadline ? formatDisplayDate(term.encoding_deadline) : "—",
      status: closed ? "Closed" : "Open",
      closedBy: closure?.closed_by_name ?? term.closed_by_name ?? undefined,
      closureNote: closure?.closure_note ?? term.closure_note ?? undefined,
      startDate: term.starts_on ?? undefined,
      endDate: term.ends_on,
    }
  })
}

export const useAcademicTerms = () => useQuery({ queryKey: KEY, queryFn: getAcademicTerms })

export function useCreateTerm() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (term: NewTerm) => {
      const years = /^\s*(\d{4})\s*[–-]\s*(\d{4})\s*$/.exec(term.academicYear)
      if (!years) throw new Error("Enter the academic year as 2025–2026.")
      const created = unwrapApiResult(await apiClient.POST("/functions/v1/catalog/school_term", {
        body: {
          start_year: Number(years[1]), end_year: Number(years[2]), term_type: SEMESTER_TO_API[term.semester] ?? "1st Semester",
          starts_on: term.startDate, ends_on: term.endDate, encoding_deadline: term.deadline, is_locked: false,
        },
      }))
      if (term.closed) {
        unwrapApiResult(await apiClient.POST("/functions/v1/school-terms/{school_term_id}/close-encoding", {
          params: { path: { school_term_id: created.id } }, body: { scope: "department" },
        }))
      }
      return created
    },
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCloseEncoding() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ termId, note }: { termId: string; note?: string }) =>
      unwrapApiResult(await apiClient.POST("/functions/v1/school-terms/{school_term_id}/close-encoding", {
        params: { path: { school_term_id: termId } }, body: { scope: "department", ...(note ? { closure_note: note } : {}) },
      })),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: KEY }),
      client.invalidateQueries({ queryKey: ["department-head", "encoding-closure"] }),
    ]),
  })
}
