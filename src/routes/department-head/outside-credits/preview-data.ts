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
