interface EquivalenceCourse {
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

export const EQUIVALENCE_SOURCE_COURSES: EquivalenceCourse[] = [
  { id: "cs-101", code: "CS 101", title: "Fundamentals of Computing", units: 3 },
  { id: "cs-102", code: "CS 102", title: "Programming Fundamentals", units: 3 },
  { id: "cs-203", code: "CS 203", title: "Data Structures", units: 3 },
  { id: "cs-301", code: "CS 301", title: "Database Management Systems", units: 3 },
]

export const EQUIVALENCE_TARGET_COURSES: EquivalenceCourse[] = [
  { id: "cc-101", code: "CC 101", title: "Introduction to Computing", units: 3 },
  { id: "cc-102", code: "CC 102", title: "Computer Programming 1", units: 3 },
  { id: "cc-104", code: "CC 104", title: "Data Structures and Algorithms", units: 3 },
  { id: "cc-105", code: "CC 105", title: "Information Management", units: 3 },
]

export const MOCK_EQUIVALENCIES: CourseEquivalence[] = [
  {
    id: "eq-1",
    fromCurriculumId: "bscs-2021",
    toCurriculumId: "bscs-2024",
    sourceCourse: EQUIVALENCE_SOURCE_COURSES[0],
    targetCourse: EQUIVALENCE_TARGET_COURSES[0],
  },
  {
    id: "eq-2",
    fromCurriculumId: "bscs-2021",
    toCurriculumId: "bscs-2024",
    sourceCourse: EQUIVALENCE_SOURCE_COURSES[1],
    targetCourse: EQUIVALENCE_TARGET_COURSES[1],
  },
  {
    id: "eq-3",
    fromCurriculumId: "bscs-2021",
    toCurriculumId: "bscs-2024",
    sourceCourse: EQUIVALENCE_SOURCE_COURSES[2],
    targetCourse: EQUIVALENCE_TARGET_COURSES[2],
  },
  {
    id: "eq-4",
    fromCurriculumId: "bscs-2021",
    toCurriculumId: "bscs-2024",
    sourceCourse: EQUIVALENCE_SOURCE_COURSES[3],
    targetCourse: EQUIVALENCE_TARGET_COURSES[3],
  },
]
