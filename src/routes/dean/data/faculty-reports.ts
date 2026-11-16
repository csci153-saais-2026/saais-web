import type { DepartmentFilter, FacultyDepartmentReport } from "@/routes/dean/types"

const CUR_BSCS_OLD = "BSCS 2018–2024"
const CUR_BSCS_NEW = "BSCS 2025–present"
const CUR_BSIT_OLD = "BSIT 2018–2024"
const CUR_BSIT_NEW = "BSIT 2025–present"

export const DEPARTMENT_OPTIONS: readonly DepartmentFilter[] = [
  "All departments",
  "DCST",
  "DIT Alang-alang",
  "DIT Isabel",
]

export const FACULTY_REPORTS: Readonly<Record<DepartmentFilter, FacultyDepartmentReport>> = {
  "All departments": {
    department: "All departments",
    students: 359,
    meanGwa: "1.98",
    withDeficiencies: 61,
    bands: [
      { label: "1.00–1.50", percent: 34, tone: "primary" },
      { label: "1.75–2.25", percent: 41, tone: "soft" },
      { label: "2.50–3.00", percent: 18, tone: "neutral" },
      { label: "5.00", percent: 4, tone: "fail" },
      { label: "INC / DR / NA", percent: 3, tone: "inc" },
    ],
    batchRows: [
      { batch: "2022", curriculum: CUR_BSCS_OLD, students: 88, meanGwa: "1.95" },
      { batch: "2023", curriculum: CUR_BSCS_NEW, students: 96, meanGwa: "2.02" },
      { batch: "2024", curriculum: CUR_BSCS_NEW, students: 101, meanGwa: "2.06" },
    ],
    cohortSamples: {
      "2022": [
        { studentNumber: "22-1-00877", name: "Carla Mendoza", gwa: "1.58" },
        { studentNumber: "22-1-00912", name: "Ella Navarro", gwa: "1.94" },
        { studentNumber: "22-1-00950", name: "Hana Lim", gwa: "2.15" },
      ],
      "2023": [
        { studentNumber: "23-1-01234", name: "Ana Reyes", gwa: "1.72" },
        { studentNumber: "23-1-01301", name: "Ben Lopez", gwa: "2.10" },
        { studentNumber: "23-1-01412", name: "Ivan Torres", gwa: "2.24" },
      ],
      "2024": [
        { studentNumber: "24-1-02011", name: "Dino Castillo", gwa: "1.88" },
        { studentNumber: "24-1-02230", name: "Gio Bautista", gwa: "2.05" },
        { studentNumber: "24-1-00124", name: "Ana Marie Santos", gwa: "1.92" },
      ],
    },
  },
  DCST: {
    department: "DCST",
    students: 212,
    meanGwa: "1.92",
    withDeficiencies: 38,
    bands: [
      { label: "1.00–1.50", percent: 36, tone: "primary" },
      { label: "1.75–2.25", percent: 42, tone: "soft" },
      { label: "2.50–3.00", percent: 16, tone: "neutral" },
      { label: "5.00", percent: 4, tone: "fail" },
      { label: "INC / DR / NA", percent: 2, tone: "inc" },
    ],
    batchRows: [
      { batch: "2022", curriculum: CUR_BSCS_OLD, students: 52, meanGwa: "1.90" },
      { batch: "2023", curriculum: CUR_BSCS_NEW, students: 58, meanGwa: "1.96" },
      { batch: "2024", curriculum: CUR_BSCS_NEW, students: 62, meanGwa: "1.99" },
    ],
    cohortSamples: {
      "2022": [
        { studentNumber: "22-1-00877", name: "Carla Mendoza", gwa: "1.58" },
        { studentNumber: "22-1-00912", name: "Ella Navarro", gwa: "1.94" },
      ],
      "2023": [
        { studentNumber: "23-1-01234", name: "Ana Reyes", gwa: "1.72" },
        { studentNumber: "23-1-01301", name: "Ben Lopez", gwa: "2.10" },
      ],
      "2024": [
        { studentNumber: "24-1-02011", name: "Dino Castillo", gwa: "1.88" },
        { studentNumber: "24-1-02230", name: "Gio Bautista", gwa: "2.05" },
      ],
    },
  },
  "DIT Alang-alang": {
    department: "DIT Alang-alang",
    students: 91,
    meanGwa: "2.05",
    withDeficiencies: 14,
    bands: [
      { label: "1.00–1.50", percent: 30, tone: "primary" },
      { label: "1.75–2.25", percent: 40, tone: "soft" },
      { label: "2.50–3.00", percent: 21, tone: "neutral" },
      { label: "5.00", percent: 6, tone: "fail" },
      { label: "INC / DR / NA", percent: 3, tone: "inc" },
    ],
    batchRows: [
      { batch: "2022", curriculum: CUR_BSIT_OLD, students: 21, meanGwa: "2.08" },
      { batch: "2023", curriculum: CUR_BSIT_NEW, students: 29, meanGwa: "2.04" },
      { batch: "2024", curriculum: CUR_BSIT_NEW, students: 33, meanGwa: "2.09" },
    ],
    cohortSamples: {
      "2022": [
        { studentNumber: "22-2-00410", name: "Marco Alverio", gwa: "2.05" },
        { studentNumber: "22-2-00428", name: "Bianca Pineda", gwa: "2.11" },
      ],
      "2023": [
        { studentNumber: "23-2-00501", name: "Paolo Mercado", gwa: "2.01" },
        { studentNumber: "23-2-00514", name: "Trisha Gomez", gwa: "2.07" },
      ],
      "2024": [
        { studentNumber: "24-2-00612", name: "Kevin Villanueva", gwa: "2.09" },
      ],
    },
  },
  "DIT Isabel": {
    department: "DIT Isabel",
    students: 56,
    meanGwa: "2.01",
    withDeficiencies: 9,
    bands: [
      { label: "1.00–1.50", percent: 33, tone: "primary" },
      { label: "1.75–2.25", percent: 39, tone: "soft" },
      { label: "2.50–3.00", percent: 20, tone: "neutral" },
      { label: "5.00", percent: 5, tone: "fail" },
      { label: "INC / DR / NA", percent: 3, tone: "inc" },
    ],
    batchRows: [
      { batch: "2022", curriculum: CUR_BSIT_OLD, students: 15, meanGwa: "2.03" },
      { batch: "2023", curriculum: CUR_BSIT_NEW, students: 19, meanGwa: "2.00" },
      { batch: "2024", curriculum: CUR_BSIT_NEW, students: 22, meanGwa: "2.01" },
    ],
    cohortSamples: {
      "2022": [
        { studentNumber: "22-3-00304", name: "Rico Salazar", gwa: "2.03" },
      ],
      "2023": [
        { studentNumber: "23-3-00381", name: "Liza Morales", gwa: "1.98" },
      ],
      "2024": [
        { studentNumber: "24-3-00419", name: "Jules De Leon", gwa: "2.01" },
      ],
    },
  },
}

