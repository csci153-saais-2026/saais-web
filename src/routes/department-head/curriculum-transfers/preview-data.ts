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
