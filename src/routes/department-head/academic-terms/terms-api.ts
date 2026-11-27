import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import { useHeadDepartmentIds } from "../shared/use-head-department-ids";
import { formatDisplayDate, formatTermDateRange } from "../shared/dh-utils";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";
import { schoolTermFormSchema } from "@/lib/validation/school-term.schema";

export type AcademicTermRecord = {
  id: string;
  academicYear: string;
  semester: string;
  termDates: string;
  encodingDeadline: string;
  status: "Open" | "Closed";
  closedBy?: string;
  closureNote?: string;
  startDate?: string;
  endDate?: string;
};

export type NewTerm = {
  academicYear: string;
  semester: string;
  startDate: string;
  endDate: string;
  deadline: string;
  closed: boolean;
};

const SEMESTER_TO_API: Record<string, ApiSchema<"SchoolTermType">> = {
  "1st semester": "1st Semester",
  "2nd semester": "2nd Semester",
  Midyear: "Summer",
};
const SEMESTER_LABEL: Record<ApiSchema<"SchoolTermType">, string> = {
  "1st Semester": "1st semester",
  "2nd Semester": "2nd semester",
  Summer: "Midyear",
};

const KEY = ["department-head", "terms"] as const;

export async function getAcademicTerms(
  departmentIds: readonly string[],
): Promise<AcademicTermRecord[]> {
  const [terms, closures] = await Promise.all([
    apiClient
      .GET("/rest/v1/school_term", {
        params: {
          query: { select: "*", order: "chronological_key.desc", limit: 100 },
        },
      })
      .then(unwrapApiResult),
    // Every department's rows are readable, so scope the read to the head's.
    departmentIds.length
      ? apiClient
          .GET("/rest/v1/department_term_encoding", {
            params: {
              query: {
                select: "*",
                department_id: postgrestFilter.inList(departmentIds),
                order: "school_term_id.asc,id.asc",
                limit: 1000,
              },
            },
          })
          .then(unwrapApiResult)
      : [],
  ]);
  // Latest term first, whatever order the server returns.
  return [...terms]
    .sort((a, b) => b.chronological_key - a.chronological_key)
    .map((term) => {
      // Closed only once every department the user heads has closed it, so the
      // close action stays available for the ones still open.
      const termClosures = closures.filter(
        (row) => row.school_term_id === term.id && row.is_closed,
      );
      const closure =
        departmentIds.length > 0 && termClosures.length >= departmentIds.length
          ? termClosures[0]
          : undefined;
      const closed = Boolean(closure) || term.is_locked;
      return {
        id: term.id,
        academicYear: `${term.start_year}–${term.end_year}`,
        semester: SEMESTER_LABEL[term.term_type],
        termDates: term.starts_on
          ? formatTermDateRange(term.starts_on, term.ends_on)
          : formatDisplayDate(term.ends_on),
        encodingDeadline: term.encoding_deadline
          ? formatDisplayDate(term.encoding_deadline)
          : "—",
        status: closed ? "Closed" : "Open",
        closedBy: closure?.closed_by_name ?? term.closed_by_name ?? undefined,
        closureNote: closure?.closure_note ?? term.closure_note ?? undefined,
        startDate: term.starts_on ?? undefined,
        endDate: term.ends_on,
      };
    });
}

export const useAcademicTerms = () => {
  const departmentIds = useHeadDepartmentIds();
  return useQuery({
    queryKey: useDepartmentHeadQueryKey(KEY),
    queryFn: () => getAcademicTerms(departmentIds),
  });
};

export function useCreateTerm() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (term: NewTerm) => {
      const years = /^\s*(\d{4})\s*[–-]\s*(\d{4})\s*$/.exec(term.academicYear);
      if (!years) throw new Error("Enter the academic year as 2025–2026.");
      const termType = SEMESTER_TO_API[term.semester];
      if (!termType) throw new Error("Select a valid semester.");
      const body = schoolTermFormSchema.parse({
        start_year: Number(years[1]),
        end_year: Number(years[2]),
        term_type: termType,
        starts_on: term.startDate,
        ends_on: term.endDate,
        encoding_deadline: term.deadline,
      });
      const created = unwrapApiResult(
        await apiClient.POST("/functions/v1/catalog/school_term", {
          body: {
            ...body,
            is_locked: false,
          },
        }),
      );
      if (term.closed) {
        unwrapApiResult(
          await apiClient.POST(
            "/functions/v1/school-terms/{school_term_id}/close-encoding",
            {
              params: { path: { school_term_id: created.id } },
              body: { scope: "department" },
            },
          ),
        );
      }
      return created;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCloseEncoding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ termId, note }: { termId: string; note?: string }) =>
      unwrapApiResult(
        await apiClient.POST(
          "/functions/v1/school-terms/{school_term_id}/close-encoding",
          {
            params: { path: { school_term_id: termId } },
            body: {
              scope: "department",
              ...(note ? { closure_note: note } : {}),
            },
          },
        ),
      ),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: KEY }),
        client.invalidateQueries({
          queryKey: ["department-head", "encoding-closure"],
        }),
      ]),
  });
}
