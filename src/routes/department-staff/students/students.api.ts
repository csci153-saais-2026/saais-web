import { listDepartmentAssignmentAdvisers as listEligibleDepartmentAdvisers } from "../adviser-assignments/adviser-assignments.api";
import {
  apiClient,
  parseContentRange,
  postgrestFilter,
  unwrapApiResult,
} from "@/lib/api";
import type { ApiSchema, OperationQuery, OperationResponse } from "@/lib/api";

const FILTER_REFERENCE_LIMIT = 1000;
const PROGRAM_FILTER_BATCH_SIZE = 50;

export type StudentRosterFilters = Pick<
  OperationQuery<"listStudentRoster">,
  "limit" | "offset" | "search" | "curriculum_version_id" | "adviser_id"
>;

type StudentRosterQuery = StudentRosterFilters &
  Pick<OperationQuery<"listStudentRoster">, "department_id">;

export interface StudentFilterOption {
  readonly id: string;
  readonly label: string;
}

export interface StudentRosterFilterOptions {
  readonly curricula: readonly StudentFilterOption[];
  readonly advisers: readonly StudentFilterOption[];
}

function assertCompleteReferenceRead<T>(
  rows: readonly T[],
  resource: string,
): void {
  if (rows.length >= FILTER_REFERENCE_LIMIT) {
    throw new Error(
      `${resource} filter options reached the ${FILTER_REFERENCE_LIMIT}-row reference-read limit; completeness could not be confirmed.`,
    );
  }
}

function completeReferenceRead<T>(
  result: { data?: T[]; error?: unknown; response: Response },
  resource: string,
): T[] {
  const rows = unwrapApiResult<T[]>(result);
  if (!Array.isArray(rows)) {
    throw new Error(`${resource} reference read returned invalid data.`);
  }
  const range = parseContentRange(result.response.headers.get("Content-Range"));
  if (
    rows.length >= FILTER_REFERENCE_LIMIT ||
    result.response.status === 206 ||
    (range?.total != null && range.total > rows.length)
  ) {
    throw new Error(
      `${resource} reference read was incomplete; eligibility could not be confirmed.`,
    );
  }
  return rows;
}

export function listStudentRoster(
  query: StudentRosterQuery,
  signal?: AbortSignal,
): Promise<OperationResponse<"listStudentRoster">> {
  return apiClient
    .GET("/functions/v1/students", {
      params: { query },
      signal,
    })
    .then((result) => {
      const roster =
        unwrapApiResult<OperationResponse<"listStudentRoster">>(result);
      if (!roster || !Array.isArray(roster.items)) {
        throw new Error(
          "The student roster service returned an invalid response.",
        );
      }
      return roster;
    });
}

export async function listDepartmentPrograms(
  departmentId: string,
  signal?: AbortSignal,
): Promise<ApiSchema<"Program">[]> {
  const result = await apiClient.GET("/rest/v1/program", {
    params: {
      query: {
        department_id: postgrestFilter.eq(departmentId),
        limit: FILTER_REFERENCE_LIMIT,
        offset: 0,
        select: "id,code,name,nominal_duration,status,department_id",
        order: "name.asc,id.asc",
      },
    },
    signal,
  });
  const programs = unwrapApiResult<ApiSchema<"Program">[]>(result);
  if (!Array.isArray(programs)) {
    throw new Error(
      "The department program reference read returned invalid data.",
    );
  }
  assertCompleteReferenceRead(programs, "Department program");
  return programs.filter((program) => program.department_id === departmentId);
}

async function listDepartmentCurricula(
  departmentId: string,
  signal?: AbortSignal,
): Promise<StudentFilterOption[]> {
  const programs = await listDepartmentPrograms(departmentId, signal);
  const programLabels = new Map(
    programs.map((program) => [program.id, program.code]),
  );
  const programBatches: string[][] = [];

  for (
    let start = 0;
    start < programs.length;
    start += PROGRAM_FILTER_BATCH_SIZE
  ) {
    programBatches.push(
      programs
        .slice(start, start + PROGRAM_FILTER_BATCH_SIZE)
        .map((program) => program.id),
    );
  }

  const curriculumGroups = await Promise.all(
    programBatches.map(async (programIds) => {
      const result = await apiClient.GET("/rest/v1/curriculum_version", {
        params: {
          query: {
            program_id: postgrestFilter.inList(programIds),
            limit: FILTER_REFERENCE_LIMIT,
            offset: 0,
            select:
              "id,program_id,version_label,effective_start,delinquency_threshold,total_units,status",
            order: "version_label.asc,id.asc",
          },
        },
        signal,
      });
      return completeReferenceRead<ApiSchema<"CurriculumVersion">>(
        result,
        "Curriculum",
      );
    }),
  );

  return curriculumGroups
    .flat()
    .map((version) => ({
      id: version.id,
      label: `${programLabels.get(version.program_id) ?? "Program"} â€” ${version.version_label}`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export { listDepartmentAssignmentAdvisers as listEligibleDepartmentAdvisers } from "../adviser-assignments/adviser-assignments.api";

export async function listStudentFilterOptions(
  departmentId: string,
  signal?: AbortSignal,
): Promise<StudentRosterFilterOptions> {
  const [curricula, advisers] = await Promise.all([
    listDepartmentCurricula(departmentId, signal),
    listEligibleDepartmentAdvisers(departmentId, signal),
  ]);
  return { curricula, advisers };
}
