export interface StudentRecord {
  name: string
  id: string
  email: string
  curriculum: string
  adviser: string
  yearLevel: string
  gwa: string
}

export const MOCK_STUDENTS: StudentRecord[] = [
  { name: "Ana Marie Santos", id: "24-1-00124", email: "ana.santos@school.edu.ph", curriculum: "BSCS 2024", adviser: "Dr. Elena Reyes", yearLevel: "2nd year", gwa: "1.50" },
  { name: "Luis Miguel Cruz", id: "23-1-00218", email: "luis.cruz@school.edu.ph", curriculum: "BSCS 2021", adviser: "Prof. Marco Villanueva", yearLevel: "3rd year", gwa: "1.75" },
  { name: "Sofia Isabel Garcia", id: "24-1-00316", email: "sofia.garcia@school.edu.ph", curriculum: "BSIT 2024", adviser: "Prof. Patricia Lim", yearLevel: "2nd year", gwa: "1.25" },
  { name: "Gabriel Mendoza", id: "22-1-00145", email: "gabriel.mendoza@school.edu.ph", curriculum: "BSCS 2021", adviser: "Dr. Elena Reyes", yearLevel: "4th year", gwa: "2.00" },
  { name: "Isabella Ramos", id: "25-1-00087", email: "isabella.ramos@school.edu.ph", curriculum: "BSCS 2024", adviser: "Prof. Marco Villanueva", yearLevel: "1st year", gwa: "1.75" },
  { name: "Daniel Flores", id: "23-1-00256", email: "daniel.flores@school.edu.ph", curriculum: "BSIT 2024", adviser: "Prof. Patricia Lim", yearLevel: "3rd year", gwa: "2.25" },
  { name: "Camille Torres", id: "24-1-00192", email: "camille.torres@school.edu.ph", curriculum: "BSCS 2024", adviser: "Dr. Elena Reyes", yearLevel: "2nd year", gwa: "1.75" },
  { name: "Rafael Navarro", id: "24-1-00204", email: "rafael.navarro@school.edu.ph", curriculum: "BSCS 2024", adviser: "Prof. Marco Villanueva", yearLevel: "2nd year", gwa: "2.00" },
]

export interface TransferRequest {
  id: string
  studentName: string
  studentId: string
  currentCurriculum: string
  requestedCurriculum: string
  adviser: string
  submittedDate: string
  reason: string
}

export const MOCK_TRANSFER_REQUESTS: TransferRequest[] = [
  {
    id: "transfer-1",
    studentName: "Luis Miguel Cruz",
    studentId: "23-1-00218",
    currentCurriculum: "BSCS 2021",
    requestedCurriculum: "BSCS 2024",
    adviser: "Prof. Marco Villanueva",
    submittedDate: "14 Aug 2025",
    reason: "Align remaining subjects with the revised BSCS curriculum. The student has completed the foundational courses, and approved equivalencies cover prior academic credits.",
  },
  {
    id: "transfer-2",
    studentName: "Gabriel Mendoza",
    studentId: "22-1-00145",
    currentCurriculum: "BSCS 2018",
    requestedCurriculum: "BSCS 2021",
    adviser: "Dr. Elena Reyes",
    submittedDate: "13 Aug 2025",
    reason: "The student is returning after an approved leave. Transfer to the active curriculum will allow completion of the remaining major subjects.",
  },
  {
    id: "transfer-3",
    studentName: "Daniel Flores",
    studentId: "23-1-00256",
    currentCurriculum: "BSIT 2021",
    requestedCurriculum: "BSIT 2024",
    adviser: "Prof. Patricia Lim",
    submittedDate: "12 Aug 2025",
    reason: "The revised curriculum offers the specialization subjects selected by the student. Completed subjects have been reviewed against the curriculum equivalencies.",
  },
]

export interface TransferDecisionHistory {
  id: string
  studentName: string
  studentId: string
  currentCurriculum: string
  requestedCurriculum: string
  adviser: string
  decision: "Approved" | "Rejected"
  decisionDate: string
  decisionReason: string
}

export const MOCK_TRANSFER_HISTORY: TransferDecisionHistory[] = [
  {
    id: "hist-1",
    studentName: "Maria Lopez",
    studentId: "23-1-00102",
    currentCurriculum: "BSCS 2021",
    requestedCurriculum: "BSCS 2024",
    adviser: "Dr. Elena Reyes",
    decision: "Approved",
    decisionDate: "12 Aug 2025",
    decisionReason: "Completed subjects have matching equivalencies.",
  },
  {
    id: "hist-2",
    studentName: "Adrian Tan",
    studentId: "22-1-00183",
    currentCurriculum: "BSCS 2018",
    requestedCurriculum: "BSCS 2024",
    adviser: "Prof. Marco Villanueva",
    decision: "Rejected",
    decisionDate: "11 Aug 2025",
    decisionReason: "Pending review of two required subject equivalencies.",
  },
]

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

export interface CourseEquivalence {
  id: string
  oldCode: string
  oldTitle: string
  oldUnits: number
  newCode: string
  newTitle: string
  newUnits: number
  pair: string
}

export const MOCK_EQUIVALENCIES: CourseEquivalence[] = [
  {
    id: "eq-1",
    oldCode: "CS 101",
    oldTitle: "Fundamentals of Computing",
    oldUnits: 3,
    newCode: "CC 101",
    newTitle: "Introduction to Computing",
    newUnits: 3,
    pair: "BSCS 2021 → 2024",
  },
  {
    id: "eq-2",
    oldCode: "CS 102",
    oldTitle: "Programming Fundamentals",
    oldUnits: 3,
    newCode: "CC 102",
    newTitle: "Computer Programming 1",
    newUnits: 3,
    pair: "BSCS 2021 → 2024",
  },
  {
    id: "eq-3",
    oldCode: "CS 203",
    oldTitle: "Data Structures",
    oldUnits: 3,
    newCode: "CC 104",
    newTitle: "Data Structures and Algorithms",
    newUnits: 3,
    pair: "BSCS 2021 → 2024",
  },
  {
    id: "eq-4",
    oldCode: "CS 301",
    oldTitle: "Database Management Systems",
    oldUnits: 3,
    newCode: "CC 105",
    newTitle: "Information Management",
    newUnits: 3,
    pair: "BSCS 2021 → 2024",
  },
]

export interface OutsideCreditRecord {
  id: string
  studentName: string
  studentId: string
  originalCode: string
  originalTitle: string
  originalUnits: number
  originSchool: string
  grade: string
  equivalentCode: string
  equivalentTitle: string
  equivalentUnits: number
  targetCurriculum: string
  entryType: "Transferee" | "Shiftee"
}

export const MOCK_OUTSIDE_CREDITS: OutsideCreditRecord[] = [
  {
    id: "cred-1",
    studentName: "Ana Marie Santos",
    studentId: "24-1-00124",
    originalCode: "CS 101",
    originalTitle: "Computing Fundamentals",
    originalUnits: 3,
    originSchool: "Northern State College",
    grade: "1.50",
    equivalentCode: "CC 101",
    equivalentTitle: "Introduction to Computing",
    equivalentUnits: 3,
    targetCurriculum: "BSCS 2024",
    entryType: "Transferee",
  },
  {
    id: "cred-2",
    studentName: "Sofia Isabel Garcia",
    studentId: "24-1-00316",
    originalCode: "IT 102",
    originalTitle: "Introductory Programming",
    originalUnits: 3,
    originSchool: "Central Polytechnic College",
    grade: "1.75",
    equivalentCode: "CC 102",
    equivalentTitle: "Computer Programming 1",
    equivalentUnits: 3,
    targetCurriculum: "BSIT 2024",
    entryType: "Transferee",
  },
  {
    id: "cred-3",
    studentName: "Isabella Ramos",
    studentId: "25-1-00087",
    originalCode: "MATH 101",
    originalTitle: "College Mathematics",
    originalUnits: 3,
    originSchool: "Same institution · BS Mathematics",
    grade: "1.50",
    equivalentCode: "GE 4",
    equivalentTitle: "Mathematics in the Modern World",
    equivalentUnits: 3,
    targetCurriculum: "BSCS 2024",
    entryType: "Shiftee",
  },
  {
    id: "cred-4",
    studentName: "Camille Torres",
    studentId: "24-1-00192",
    originalCode: "ENG 101",
    originalTitle: "Communication Skills",
    originalUnits: 3,
    originSchool: "East Valley University",
    grade: "1.25",
    equivalentCode: "GE 1",
    equivalentTitle: "Purposive Communication",
    equivalentUnits: 3,
    targetCurriculum: "BSCS 2024",
    entryType: "Transferee",
  },
]

export interface AcademicTermRecord {
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

export const MOCK_ACADEMIC_TERMS: AcademicTermRecord[] = [
  {
    id: "term-1",
    academicYear: "2025–2026",
    semester: "1st semester",
    termDates: "04 Aug – 19 Dec 2025",
    encodingDeadline: "05 Jan 2026",
    status: "Open",
  },
  {
    id: "term-2",
    academicYear: "2024–2025",
    semester: "2nd semester",
    termDates: "13 Jan – 30 May 2025",
    encodingDeadline: "13 Jun 2025",
    status: "Closed",
    closedBy: "Dr. Andrea Dela Cruz",
  },
  {
    id: "term-3",
    academicYear: "2024–2025",
    semester: "1st semester",
    termDates: "05 Aug – 20 Dec 2024",
    encodingDeadline: "06 Jan 2025",
    status: "Closed",
    closedBy: "Dr. Andrea Dela Cruz",
  },
  {
    id: "term-4",
    academicYear: "2023–2024",
    semester: "2nd semester",
    termDates: "15 Jan – 31 May 2024",
    encodingDeadline: "14 Jun 2024",
    status: "Closed",
    closedBy: "Dr. Andrea Dela Cruz",
  },
]

export interface DepartmentNotificationRecord {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
  to: string
  kind: "transfer" | "alert" | "note"
}

export const MOCK_DEPARTMENT_NOTIFICATIONS: DepartmentNotificationRecord[] = [
  {
    id: "notif-1",
    title: "New transfer request submitted for Luis Miguel Cruz",
    body: "Prof. Marco Villanueva endorsed a curriculum transfer from BSCS 2021 to BSCS 2024.",
    time: "10m ago",
    unread: true,
    to: "/department-head/curriculum-transfers",
    kind: "transfer",
  },
  {
    id: "notif-2",
    title: "Grade encoding deadline approaching for AY 2025–2026 1st sem",
    body: "Encoding closes on 05 Jan 2026. Remind advisers to finalize pending grade submissions.",
    time: "2h ago",
    unread: true,
    to: "/department-head/academic-terms",
    kind: "alert",
  },
  {
    id: "notif-3",
    title: "Outside credits evaluated for Ana Marie Santos",
    body: "CS 101 · Computing Fundamentals (Northern State College) mapped to CC 101.",
    time: "Yesterday",
    unread: false,
    to: "/department-head/outside-credits",
    kind: "note",
  },
]
