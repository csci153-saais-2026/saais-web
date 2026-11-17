import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, unwrapApiResult } from "@/lib/api"

export interface EquivalenceCourse {
  id: string
  code: string
  title: string
  units: number
}

export interface CourseEquivalence {
  id: string
  fromCurriculumId: string
  toCurriculumId: string
  sourceCourse: EquivalenceCourse
  targetCourse: EquivalenceCourse
}

export interface CurriculumOption {
  id: string
  label: string
}

const KEY = ["department-head", "equivalence"] as const

async function getEquivalenceData() {
  const [versions, courses, pairs] = await Promise.all([
    apiClient.GET("/rest/v1/curriculum_version", { params: { query: { select: "*", order: "version_label.asc", limit: 100 } } }).then(unwrapApiResult),
    apiClient.GET("/rest/v1/course", { params: { query: { select: "*", order: "code.asc", limit: 100 } } }).then(unwrapApiResult),
    apiClient.GET("/rest/v1/curriculum_pair_equivalence", { params: { query: { select: "*", order: "created_at.desc", limit: 100 } } }).then(unwrapApiResult),
  ])
  const courseOptions: EquivalenceCourse[] = courses.map((course) => ({ id: course.id, code: course.code, title: course.title, units: course.units }))
  const equivalencies = pairs.flatMap((pair): CourseEquivalence[] => {
    const sourceCourse = courseOptions.find((course) => course.id === pair.source_course_id)
    const targetCourse = courseOptions.find((course) => course.id === pair.target_course_id)
    return sourceCourse && targetCourse
      ? [{ id: pair.id, fromCurriculumId: pair.from_curriculum_version_id, toCurriculumId: pair.to_curriculum_version_id, sourceCourse, targetCourse }]
      : []
  })
  const curricula: CurriculumOption[] = versions.map((version) => ({ id: version.id, label: version.version_label }))
  return { curricula, courses: courseOptions, equivalencies }
}

export const useEquivalenceData = () => useQuery({ queryKey: KEY, queryFn: getEquivalenceData })

export function useAddEquivalence() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: { fromId: string; toId: string; sourceCourseId: string; targetCourseId: string }) =>
      unwrapApiResult(await apiClient.POST("/functions/v1/catalog/curriculum-pair-equivalences", {
        body: {
          from_curriculum_version_id: input.fromId, to_curriculum_version_id: input.toId,
          source_course_id: input.sourceCourseId, target_course_id: input.targetCourseId,
        },
      })),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  })
}
