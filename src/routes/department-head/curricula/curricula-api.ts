import { useQuery } from "@tanstack/react-query";
import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";

export type CurriculumVersionStatus = "active" | "draft" | "retired";
export type CurriculumSemester = "Semester 1" | "Semester 2" | "Midyear";
export type CurriculumSlotType =
  "Required course" | "Elective slot" | "GE slot";

export const CURRICULUM_SEMESTERS: CurriculumSemester[] = [
  "Semester 1",
  "Semester 2",
  "Midyear",
];

export interface CurriculumCourseSlot {
  id: string;
  courseId: string | null;
  courseOrSlot: string;
  requiredUnits: number;
  type: CurriculumSlotType;
  hasAcademicHistory?: boolean;
}

export interface CurriculumTermBlock {
  id: string;
  year: number;
  sem: CurriculumSemester;
  rows: CurriculumCourseSlot[];
}

export interface CurriculumVersionRecord {
  id: string;
  programId: string;
  departmentId: string;
  /** Program code, e.g. BSCS. */
  prog: string;
  /** Version label without the program code, e.g. "2024-2025 v1". */
  year: string;
  units: number;
  enrolled: number;
  from: string;
  status: CurriculumVersionStatus;
  terms: CurriculumTermBlock[];
  references?: ("curriculum transfer requests" | "course equivalence rules")[];
}

export interface CurriculaData {
  versions: CurriculumVersionRecord[];
  programs: { id: string; code: string }[];
  departments: { id: string; name: string }[];
  courses: {
    id: string;
    departmentId: string;
    code: string;
    title: string;
    status: string;
  }[];
}

const KEY = ["department-head", "curricula"] as const;
const sequenceOf = (sem: CurriculumSemester) =>
  CURRICULUM_SEMESTERS.indexOf(sem) + 1;
const semesterOf = (sequence: number): CurriculumSemester =>
  CURRICULUM_SEMESTERS[sequence - 1] ?? "Semester 1";

const SLOT_TYPE_LABEL: Partial<
  Record<ApiSchema<"CurriculumSlotType">, CurriculumSlotType>
> = { elective: "Elective slot", ge: "GE slot" };
const SLOT_TYPE_API: Record<
  CurriculumSlotType,
  ApiSchema<"CurriculumSlotType">
> = {
  "Required course": "required",
  "Elective slot": "elective",
  "GE slot": "ge",
};

async function getCurricula(): Promise<CurriculaData> {
  const get = <T>(load: () => Promise<{ data?: T; error?: unknown }>) =>
    load().then(unwrapApiResult as (value: { data?: T; error?: unknown }) => T);
  const [
    versions,
    programs,
    terms,
    slots,
    courses,
    departments,
    transfers,
    pairs,
  ] = await Promise.all([
    get(() =>
      apiClient.GET("/rest/v1/curriculum_version", {
        params: { query: { select: "*", limit: 100 } },
      }),
    ),
    get(() =>
      apiClient.GET("/rest/v1/program", {
        params: { query: { select: "*", limit: 100 } },
      }),
    ),
    get(() =>
      apiClient.GET("/rest/v1/curriculum_term", {
        params: { query: { select: "*", limit: 100 } },
      }),
    ),
    get(() =>
      apiClient.GET("/rest/v1/curriculum_term_course", {
        params: { query: { select: "*", limit: 100 } },
      }),
    ),
    get(() =>
      apiClient.GET("/rest/v1/course", {
        params: { query: { select: "*", limit: 100 } },
      }),
    ),
    get(() =>
      apiClient.GET("/rest/v1/department", {
        params: {
          query: { select: "id,name", order: "name.asc", limit: 1000 },
        },
      }),
    ),
    get(() =>
      apiClient.GET("/rest/v1/curriculum_transfer_request", {
        params: { query: { select: "*", limit: 100 } },
      }),
    ),
    get(() =>
      apiClient.GET("/rest/v1/curriculum_pair_equivalence", {
        params: { query: { select: "*", limit: 100 } },
      }),
    ),
  ]);
  const records = versions.map((version): CurriculumVersionRecord => {
    const program = programs.find((item) => item.id === version.program_id);
    const code = program?.code ?? "Program";
    const references: NonNullable<CurriculumVersionRecord["references"]> = [];
    if (
      transfers.some(
        (item) =>
          item.from_curriculum_version_id === version.id ||
          item.to_curriculum_version_id === version.id,
      )
    )
      references.push("curriculum transfer requests");
    if (
      pairs.some(
        (item) =>
          item.from_curriculum_version_id === version.id ||
          item.to_curriculum_version_id === version.id,
      )
    )
      references.push("course equivalence rules");
    return {
      id: version.id,
      programId: version.program_id,
      departmentId: program?.department_id ?? "",
      prog: code,
      year: version.version_label.startsWith(`${code} `)
        ? version.version_label.slice(code.length + 1)
        : version.version_label,
      units: version.total_units,
      enrolled: version.enrolled_student_count ?? 0,
      from: version.effective_start,
      status:
        version.status === "active" || version.status === "draft"
          ? version.status
          : "retired",
      references: references.length ? references : undefined,
      terms: terms
        .filter((term) => term.curriculum_version_id === version.id)
        .sort(
          (a, b) =>
            a.year_level - b.year_level || a.term_sequence - b.term_sequence,
        )
        .map((term): CurriculumTermBlock => ({
          id: term.id,
          year: term.year_level,
          sem: semesterOf(term.term_sequence),
          rows: slots
            .filter((slot) => slot.curriculum_term_id === term.id)
            .map((slot): CurriculumCourseSlot => {
              const course = courses.find((item) => item.id === slot.course_id);
              return {
                id: slot.id,
                courseId: slot.course_id,
                courseOrSlot: course
                  ? `${course.code} — ${course.title}`
                  : (slot.slot_label ?? "Unnamed slot"),
                requiredUnits: slot.nominal_units,
                type:
                  (slot.slot_type && SLOT_TYPE_LABEL[slot.slot_type]) ||
                  "Required course",
              };
            }),
        })),
    };
  });
  return {
    versions: records,
    programs: programs.map((program) => ({
      id: program.id,
      code: program.code,
    })),
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
    })),
    courses: courses.map((course) => ({
      id: course.id,
      departmentId: course.department_id,
      code: course.code,
      title: course.title,
      status: course.status,
    })),
  };
}

export const useCurricula = () => {
  return useQuery({
    queryKey: useDepartmentHeadQueryKey(KEY),
    queryFn: getCurricula,
  });
};

export type CreateCurriculumVersionInput = {
  programId: string;
  label: string;
  start: string;
  units: number;
  status: CurriculumVersionStatus;
  cloneFromVersionId?: string;
};

export async function createCurriculumVersion(
  input: CreateCurriculumVersionInput,
) {
  const created = unwrapApiResult(
    await apiClient.POST("/functions/v1/catalog/curriculum_version", {
      body: {
        program_id: input.programId,
        version_label: input.label,
        effective_start: input.start,
        total_units: input.units,
        ...(input.cloneFromVersionId
          ? { clone_from_version_id: input.cloneFromVersionId }
          : {}),
      },
    }),
  );
  if (input.status !== "draft") {
    unwrapApiResult(
      await apiClient.PATCH("/functions/v1/catalog/curriculum_version/{id}", {
        params: { path: { id: created.id } },
        body: { status: input.status },
      }),
    );
  }
  return created;
}

export type UpdateCurriculumVersionInput = Omit<
  CreateCurriculumVersionInput,
  "programId" | "cloneFromVersionId"
>;

export async function updateCurriculumVersion(
  id: string,
  input: UpdateCurriculumVersionInput,
) {
  return unwrapApiResult(
    await apiClient.PATCH("/functions/v1/catalog/curriculum_version/{id}", {
      params: { path: { id } },
      body: {
        version_label: input.label,
        effective_start: input.start,
        total_units: input.units,
        status: input.status,
      },
    }),
  );
}

export async function deleteCurriculumVersion(id: string) {
  return unwrapApiResult(
    await apiClient.DELETE("/functions/v1/catalog/curriculum_version/{id}", {
      params: { path: { id } },
    }),
  );
}

export async function createCurriculumTerm(
  versionId: string,
  year: number,
  sem: CurriculumSemester,
) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/catalog/curriculum_term", {
      body: {
        curriculum_version_id: versionId,
        year_level: year,
        term_sequence: sequenceOf(sem),
        slots: [],
      },
    }),
  );
}

export async function updateCurriculumTerm(
  id: string,
  year: number,
  sem: CurriculumSemester,
) {
  return unwrapApiResult(
    await apiClient.PATCH("/functions/v1/catalog/curriculum_term/{id}", {
      params: { path: { id } },
      body: { year_level: year, term_sequence: sequenceOf(sem) },
    }),
  );
}

export async function deleteCurriculumTerm(id: string) {
  return unwrapApiResult(
    await apiClient.DELETE("/functions/v1/catalog/curriculum_term/{id}", {
      params: { path: { id } },
    }),
  );
}

export async function createCurriculumSlot(
  termId: string,
  courseId: string,
  units: number,
  type: CurriculumSlotType,
) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/catalog/curriculum_term_course", {
      body: {
        curriculum_term_id: termId,
        course_id: courseId,
        slot_label: null,
        nominal_units: units,
        slot_type: SLOT_TYPE_API[type],
        is_elective_slot: type === "Elective slot",
      },
    }),
  );
}

export async function updateCurriculumSlot(
  id: string,
  courseId: string,
  units: number,
  type: CurriculumSlotType,
) {
  return unwrapApiResult(
    await apiClient.PATCH("/functions/v1/catalog/curriculum_term_course/{id}", {
      params: { path: { id } },
      body: {
        course_id: courseId,
        slot_label: null,
        nominal_units: units,
        slot_type: SLOT_TYPE_API[type],
        is_elective_slot: type === "Elective slot",
      },
    }),
  );
}

export async function deleteCurriculumSlot(id: string) {
  return unwrapApiResult(
    await apiClient.DELETE(
      "/functions/v1/catalog/curriculum_term_course/{id}",
      {
        params: { path: { id } },
      },
    ),
  );
}

export type CreateCatalogCourseInput = {
  departmentId: string;
  code: string;
  title: string;
  units: number;
  elective: boolean;
  termId: string;
};

export async function createCatalogCourse(input: CreateCatalogCourseInput) {
  const course = unwrapApiResult(
    await apiClient.POST("/functions/v1/catalog/course", {
      body: {
        department_id: input.departmentId,
        code: input.code,
        title: input.title,
        units: input.units,
        category: input.elective ? "elective" : "major",
        is_elective: input.elective,
        status: "active",
        repeatable_type: "none",
      },
    }),
  );
  unwrapApiResult(
    await apiClient.POST("/functions/v1/catalog/curriculum_term_course", {
      body: {
        curriculum_term_id: input.termId,
        course_id: course.id,
        nominal_units: input.units,
        slot_type: input.elective ? "elective" : "required",
        is_elective_slot: input.elective,
      },
    }),
  );
  return course;
}
