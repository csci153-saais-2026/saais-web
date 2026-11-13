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
