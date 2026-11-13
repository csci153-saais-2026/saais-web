export type CurriculumVersionStatus = "active" | "draft" | "retired"

export type CurriculumSemester = "Semester 1" | "Semester 2" | "Midyear"

export type CurriculumSlotType = "Required course" | "Elective slot" | "GE slot"

export interface CurriculumCourseSlot {
  id: string
  courseOrSlot: string
  requiredUnits: number
  type: CurriculumSlotType
  hasAcademicHistory?: boolean
}

export interface CurriculumTermBlock {
  id: string
  year: number
  sem: CurriculumSemester
  rows: CurriculumCourseSlot[]
}

export interface CurriculumVersionRecord {
  id: string
  prog: "BSCS" | "BSIT"
  year: string
  units: number
  enrolled: number
  from: string
  status: CurriculumVersionStatus
  terms: CurriculumTermBlock[]
  references?: ("curriculum transfer requests" | "course equivalence rules")[]
}

export const FACULTY_DEPARTMENTS: Record<string, string[]> = {
  "Faculty of Computer Studies": ["Computer Science", "Information Technology"],
  "Faculty of Arts and Sciences": [
    "Mathematics and Statistics",
    "Psychology",
    "General Education",
  ],
  "University Administration": ["Office of the Registrar"],
}

export const CURRICULUM_SEMESTERS: CurriculumSemester[] = [
  "Semester 1",
  "Semester 2",
  "Midyear",
]

export const MOCK_CURRICULA_VERSIONS: CurriculumVersionRecord[] = [
  {
    id: "ver-bscs-2023",
    prog: "BSCS",
    year: "2023–2024",
    units: 147,
    enrolled: 286,
    from: "2023-06-01",
    status: "active",
    terms: [
      {
        id: "bscs23-y1-s1",
        year: 1,
        sem: "Semester 1",
        rows: [
          { id: "r1", courseOrSlot: "CSIT 100 — Introduction to Computing", requiredUnits: 3, type: "Required course", hasAcademicHistory: true },
          { id: "r2", courseOrSlot: "CSIT 101 — Fundamentals of Programming", requiredUnits: 4, type: "Required course" },
          { id: "r3", courseOrSlot: "CSci 180 — Pre-calculus for CS", requiredUnits: 3, type: "Required course" },
          { id: "r4", courseOrSlot: "Comm 11 — Purposive Communication", requiredUnits: 3, type: "Required course" },
          { id: "r5", courseOrSlot: "Entr 11 — Entrepreneurial Mind", requiredUnits: 3, type: "Required course" },
          { id: "r6", courseOrSlot: "ITec 11 — Living in the IT Era", requiredUnits: 3, type: "Required course" },
          { id: "r7", courseOrSlot: "PE 1 — Physical Fitness", requiredUnits: 2, type: "Required course" },
        ],
      },
      {
        id: "bscs23-y1-s2",
        year: 1,
        sem: "Semester 2",
        rows: [
          { id: "r8", courseOrSlot: "CSIT 102 — Data Structures", requiredUnits: 4, type: "Required course" },
          { id: "r9", courseOrSlot: "CSci 181 — Discrete Mathematics", requiredUnits: 3, type: "Required course" },
          { id: "r10", courseOrSlot: "Math 11 — Calculus 1", requiredUnits: 3, type: "Required course" },
          { id: "r11", courseOrSlot: "GE elective", requiredUnits: 3, type: "GE slot" },
        ],
      },
    ],
  },
  {
    id: "ver-bscs-2019",
    prog: "BSCS",
    year: "2019–2020",
    units: 150,
    enrolled: 142,
    from: "2019-06-01",
    status: "retired",
    references: ["curriculum transfer requests"],
    terms: [
      {
        id: "bscs19-y1-s1",
        year: 1,
        sem: "Semester 1",
        rows: [
          { id: "r12", courseOrSlot: "CSIT 100 — Introduction to Computing", requiredUnits: 3, type: "Required course" },
          { id: "r13", courseOrSlot: "CSIT 101 — Fundamentals of Programming", requiredUnits: 4, type: "Required course" },
        ],
      },
    ],
  },
  {
    id: "ver-bsit-2023",
    prog: "BSIT",
    year: "2023–2024",
    units: 148,
    enrolled: 184,
    from: "2023-06-01",
    status: "active",
    terms: [
      {
        id: "bsit23-y1-s1",
        year: 1,
        sem: "Semester 1",
        rows: [
          { id: "r14", courseOrSlot: "ITec 11 — Living in the IT Era", requiredUnits: 3, type: "Required course" },
          { id: "r15", courseOrSlot: "CSIT 101 — Fundamentals of Programming", requiredUnits: 4, type: "Required course" },
        ],
      },
    ],
  },
]
