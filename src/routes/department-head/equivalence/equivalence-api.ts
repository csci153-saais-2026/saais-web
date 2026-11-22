import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, unwrapApiResult } from "@/lib/api";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";

export interface EquivalenceCourse {
  id: string;
  code: string;
  title: string;
  units: number;
}

export interface CourseEquivalence {
  id: string;
  fromCurriculumId: string;
  toCurriculumId: string;
  sourceCourse: EquivalenceCourse;
  targetCourse: EquivalenceCourse;
}

export interface CurriculumOption {
  id: string;
  label: string;
}

const KEY = ["department-head", "equivalence"] as const;

// Contract-supported offset pagination; do not truncate catalogs at the first page.
async function readPages<T>(
  read: (offset: number) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= 100000;) {
    const page = await read(offset);
    if (!page.length) return rows;
    rows.push(...page);
    offset += page.length;
  }
  throw new Error(
    "Too many equivalence records to load. Contact your administrator.",
  );
}

async function getEquivalenceData() {
  const [versions, courses, pairs] = await Promise.all([
    readPages((offset) =>
      apiClient
        .GET("/rest/v1/curriculum_version", {
          params: {
            query: {
              select: "id,version_label",
              order: "version_label.asc,id.asc",
              limit: 100,
              offset,
            },
          },
        })
        .then(unwrapApiResult),
    ),
    readPages((offset) =>
      apiClient
        .GET("/rest/v1/course", {
          params: {
            query: {
              select: "id,code,title,units",
              order: "code.asc,id.asc",
              limit: 100,
              offset,
            },
          },
        })
        .then(unwrapApiResult),
    ),
    readPages((offset) =>
      apiClient
        .GET("/rest/v1/curriculum_pair_equivalence", {
          params: {
            query: {
              select:
                "id,from_curriculum_version_id,to_curriculum_version_id,source_course_id,target_course_id",
              order: "created_at.desc,id.asc",
              limit: 100,
              offset,
            },
          },
        })
        .then(unwrapApiResult),
    ),
  ]);
  const courseOptions: EquivalenceCourse[] = courses.map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    units: course.units,
  }));
  const equivalencies = pairs.flatMap((pair): CourseEquivalence[] => {
    const sourceCourse = courseOptions.find(
      (course) => course.id === pair.source_course_id,
    );
    const targetCourse = courseOptions.find(
      (course) => course.id === pair.target_course_id,
    );
    return sourceCourse && targetCourse
      ? [
          {
            id: pair.id,
            fromCurriculumId: pair.from_curriculum_version_id,
            toCurriculumId: pair.to_curriculum_version_id,
            sourceCourse,
            targetCourse,
          },
        ]
      : [];
  });
  const curricula: CurriculumOption[] = versions.map((version) => ({
    id: version.id,
    label: version.version_label,
  }));
  return { curricula, courses: courseOptions, equivalencies };
}

export const useEquivalenceData = () =>
  useQuery({
    queryKey: useDepartmentHeadQueryKey(KEY),
    queryFn: getEquivalenceData,
  });

export function useAddEquivalence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fromId: string;
      toId: string;
      sourceCourseId: string;
      targetCourseId: string;
    }) =>
      unwrapApiResult(
        await apiClient.POST(
          "/functions/v1/catalog/curriculum-pair-equivalences",
          {
            body: {
              from_curriculum_version_id: input.fromId,
              to_curriculum_version_id: input.toId,
              source_course_id: input.sourceCourseId,
              target_course_id: input.targetCourseId,
            },
          },
        ),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteEquivalence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapApiResult(
        await apiClient.DELETE(
          "/functions/v1/catalog/curriculum-pair-equivalences/{id}",
          { params: { path: { id } } },
        ),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
