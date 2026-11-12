import type { ChecklistRow } from "@/components/features/checklist-term-group"
import type { Status } from "@/components/ui/status-badge"

// Presentation fixtures copied from mockup/Adviser; no API or persistence.
export const checklistTerms: { title: string; rows: ChecklistRow[] }[] = [
  {
    "title": "Year 1 · Semester 1",
    "rows": [
      {
        "code": "CSIT 100",
        "title": "Introduction to Computing",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "CSIT 100 · grade 1.50",
        "attempts": 1
      },
      {
        "code": "CSIT 101",
        "title": "Fundamentals of Programming",
        "unitsEarned": 4,
        "unitsRequired": 4,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "CSIT 101 · grade 1.75",
        "attempts": 1
      },
      {
        "code": "CSci 180",
        "title": "Pre-calculus for CS",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "CSci 180 · grade 2.00",
        "attempts": 3
      },
      {
        "code": "Comm 11",
        "title": "Purposive Communication",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "Comm 11 · grade 1.25",
        "attempts": 1
      },
      {
        "code": "Entr 11",
        "title": "Entrepreneurial Mind",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "Entr 11 · grade 1.50",
        "attempts": 1
      },
      {
        "code": "ITec 11",
        "title": "Living in the IT Era",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "ITec 11 · grade 1.75",
        "attempts": 1
      },
      {
        "code": "ScSc 11",
        "title": "Understanding the Self",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "ScSc 11 · grade 2.00",
        "attempts": 1
      },
      {
        "code": "PhEd 11",
        "title": "PATHFit 1 - Movement Competency Training",
        "unitsEarned": 2,
        "unitsRequired": 2,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "PhEd 11 · grade 1.00",
        "attempts": 1
      },
      {
        "code": "NSTP 11",
        "title": "National Service Training Program I",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "NSTP 11 · grade 1.00",
        "attempts": 1
      }
    ]
  },
  {
    "title": "Year 1 · Semester 2",
    "rows": [
      {
        "code": "CSIT 102",
        "title": "Intermediate Programming",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "CSIT 102 · grade 1.50",
        "attempts": 1
      },
      {
        "code": "CSci 102",
        "title": "Discrete Structures I",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "inc",
        "source": "Direct",
        "sourceDetail": "CSci 102 · grade —",
        "attempts": 1
      },
      {
        "code": "CSci 121",
        "title": "Computer Organization and Architecture",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "CSci 121 · grade 2.00",
        "attempts": 1
      },
      {
        "code": "CSci 181",
        "title": "Differential Calculus for CS",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "CSci 181 · grade 1.75",
        "attempts": 1
      },
      {
        "code": "Math 11",
        "title": "Mathematics in the Modern World",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "Math 11 · grade 2.00",
        "attempts": 1
      },
      {
        "code": "ScSc 12",
        "title": "Readings in Philippine History",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "ScSc 12 · grade 1.50",
        "attempts": 1
      },
      {
        "code": "ScTS 11a",
        "title": "Science, Technology, and Society",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Discontinued equivalency",
        "sourceDetail": "Envi 11 · grade 1.75",
        "attempts": 1
      },
      {
        "code": "Envi 11",
        "title": "Environmental Science",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 1
      },
      {
        "code": "PhEd 12",
        "title": "PATHFit 2 - Exercise-based Fitness Activities",
        "unitsEarned": 2,
        "unitsRequired": 2,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "PhEd 12 · grade 1.00",
        "attempts": 1
      },
      {
        "code": "NSTP 12",
        "title": "National Service Training Program II",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Direct",
        "sourceDetail": "NSTP 12 · grade 1.00",
        "attempts": 1
      }
    ]
  },
  {
    "title": "Year 2 · Semester 1",
    "rows": [
      {
        "code": "CSIT 103",
        "title": "Data Structures and Algorithms",
        "unitsEarned": 0,
        "unitsRequired": 4,
        "status": "enrolled",
        "source": "Direct",
        "sourceDetail": "CSIT 103 · grade —",
        "attempts": 1
      },
      {
        "code": "CSIT 104",
        "title": "Information Management",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "enrolled",
        "source": "Direct",
        "sourceDetail": "CSIT 104 · grade —",
        "attempts": 1
      },
      {
        "code": "CSIT 105",
        "title": "Applications Development and Emerging Technologies",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "enrolled",
        "source": "Direct",
        "sourceDetail": "CSIT 105 · grade —",
        "attempts": 1
      },
      {
        "code": "CSci 103",
        "title": "Discrete Structures II",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "enrolled",
        "source": "Direct",
        "sourceDetail": "CSci 103 · grade —",
        "attempts": 1
      },
      {
        "code": "CSci 122",
        "title": "Human Computer Interaction",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "enrolled",
        "source": "Direct",
        "sourceDetail": "CSci 122 · grade —",
        "attempts": 1
      },
      {
        "code": "CSci 182",
        "title": "Integral Calculus for CS",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "enrolled",
        "source": "Direct",
        "sourceDetail": "CSci 182 · grade —",
        "attempts": 2
      },
      {
        "code": "ScSc 13",
        "title": "The Contemporary World",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "enrolled",
        "source": "Direct",
        "sourceDetail": "ScSc 13 · grade —",
        "attempts": 1
      },
      {
        "code": "PhEd 13",
        "title": "PATHFit 3",
        "unitsEarned": 0,
        "unitsRequired": 2,
        "status": "enrolled",
        "source": "Direct",
        "sourceDetail": "PhEd 13 · grade —",
        "attempts": 1
      }
    ]
  },
  {
    "title": "Year 2 · Semester 2",
    "rows": [
      {
        "code": "CSci 104",
        "title": "Algorithms and Complexity",
        "unitsEarned": 0,
        "unitsRequired": 4,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 126",
        "title": "Networks and Communications",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 120",
        "title": "Object-oriented Programming",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 154",
        "title": "Quantitative Methods for CS",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 183",
        "title": "Linear Algebra and Matrix Theory",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "Humn 11",
        "title": "Art Appreciation",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "ScSc 16",
        "title": "Life and Works of Rizal",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "PhEd 14",
        "title": "PATHFit 4",
        "unitsEarned": 0,
        "unitsRequired": 2,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      }
    ]
  },
  {
    "title": "Year 3 · Semester 1",
    "rows": [
      {
        "code": "CSci 107",
        "title": "Automata Theory and Formal Languages",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 123",
        "title": "Operating Systems",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 128",
        "title": "Information Assurance and Security",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 135",
        "title": "Software Engineering I",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Transfer equivalency",
        "sourceDetail": "CSci E-WA1 · grade 1.75",
        "attempts": 1
      },
      {
        "code": "CSci 141",
        "title": "Artificial Intelligence",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 198",
        "title": "Research Planning and Manuscript Preparation",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "Phlo 11",
        "title": "Ethics",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      }
    ]
  },
  {
    "title": "Year 3 · Semester 2",
    "rows": [
      {
        "code": "CSci 200",
        "title": "Undergraduate Thesis I",
        "unitsEarned": 0,
        "unitsRequired": 2,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 108",
        "title": "Programming Languages",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 136",
        "title": "Software Engineering II",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 193",
        "title": "Social Issues and Professional Practice",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CS Elective 1",
        "title": "Open elective slot",
        "unitsEarned": 3,
        "unitsRequired": 3,
        "status": "passed",
        "source": "Elective mapping",
        "sourceDetail": "CSci E-SC1 · grade 1.50",
        "attempts": 1
      }
    ]
  },
  {
    "title": "Year 3 · Semester 3",
    "rows": [
      {
        "code": "CS Elective 2",
        "title": "Open elective slot",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      }
    ]
  },
  {
    "title": "Year 4 · Semester 1",
    "rows": [
      {
        "code": "CS Elective 3",
        "title": "Open elective slot",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 199",
        "title": "Undergraduate Seminar",
        "unitsEarned": 0,
        "unitsRequired": 1,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      },
      {
        "code": "CSci 200-II",
        "title": "Undergraduate Thesis II",
        "unitsEarned": 0,
        "unitsRequired": 4,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      }
    ]
  },
  {
    "title": "Year 4 · Semester 2",
    "rows": [
      {
        "code": "CSci 200a",
        "title": "Internship / On-the-Job Training / Practicum",
        "unitsEarned": 0,
        "unitsRequired": 3,
        "status": "not-taken",
        "source": "Not yet taken",
        "sourceDetail": "",
        "attempts": 0
      }
    ]
  }
]

export const gradeTerms: { title: string; description: string; rows: { code: string; title: string; units: string; midterm: string; final: string; status: Status }[] }[] = [
  {
    "title": "2025 - 2026 · 1st Semester",
    "description": "Term GWA — · 0 failed units · Open term",
    "rows": [
      {
        "code": "CSIT 103",
        "title": "Data Structures and Algorithms",
        "units": "4",
        "midterm": "—",
        "final": "—",
        "status": "enrolled"
      },
      {
        "code": "CSIT 104",
        "title": "Information Management",
        "units": "3",
        "midterm": "—",
        "final": "—",
        "status": "enrolled"
      },
      {
        "code": "CSIT 105",
        "title": "Applications Development and Emerging Technologies",
        "units": "3",
        "midterm": "—",
        "final": "—",
        "status": "enrolled"
      },
      {
        "code": "CSci 103",
        "title": "Discrete Structures II",
        "units": "3",
        "midterm": "—",
        "final": "—",
        "status": "enrolled"
      },
      {
        "code": "CSci 122",
        "title": "Human Computer Interaction",
        "units": "3",
        "midterm": "—",
        "final": "—",
        "status": "enrolled"
      },
      {
        "code": "CSci 182",
        "title": "Integral Calculus for CS",
        "units": "3",
        "midterm": "—",
        "final": "—",
        "status": "enrolled"
      },
      {
        "code": "ScSc 13",
        "title": "The Contemporary World",
        "units": "3",
        "midterm": "—",
        "final": "—",
        "status": "enrolled"
      },
      {
        "code": "PhEd 13",
        "title": "PATHFit 3",
        "units": "2",
        "midterm": "—",
        "final": "—",
        "status": "enrolled"
      }
    ]
  },
  {
    "title": "2024 - 2025 · 2nd Semester",
    "description": "Term GWA 1.58 · 0 failed units · Locked term",
    "rows": [
      {
        "code": "CSIT 100",
        "title": "Introduction to Computing",
        "units": "3",
        "midterm": "1.50",
        "final": "1.50",
        "status": "passed"
      },
      {
        "code": "CSIT 101",
        "title": "Fundamentals of Programming",
        "units": "4",
        "midterm": "1.75",
        "final": "1.75",
        "status": "passed"
      },
      {
        "code": "CSci 180",
        "title": "Pre-calculus for CS",
        "units": "3",
        "midterm": "2.00",
        "final": "2.00",
        "status": "passed"
      },
      {
        "code": "Comm 11",
        "title": "Purposive Communication",
        "units": "3",
        "midterm": "1.25",
        "final": "1.25",
        "status": "passed"
      },
      {
        "code": "Entr 11",
        "title": "Entrepreneurial Mind",
        "units": "3",
        "midterm": "1.50",
        "final": "1.50",
        "status": "passed"
      },
      {
        "code": "ITec 11",
        "title": "Living in the IT Era",
        "units": "3",
        "midterm": "1.75",
        "final": "1.75",
        "status": "passed"
      },
      {
        "code": "ScSc 11",
        "title": "Understanding the Self",
        "units": "3",
        "midterm": "2.00",
        "final": "2.00",
        "status": "passed"
      },
      {
        "code": "PhEd 11",
        "title": "PATHFit 1 - Movement Competency Training",
        "units": "2",
        "midterm": "1.00",
        "final": "1.00",
        "status": "passed"
      },
      {
        "code": "NSTP 11",
        "title": "National Service Training Program I",
        "units": "3",
        "midterm": "1.00",
        "final": "1.00",
        "status": "passed"
      },
      {
        "code": "CSIT 102",
        "title": "Intermediate Programming",
        "units": "3",
        "midterm": "1.50",
        "final": "1.50",
        "status": "passed"
      },
      {
        "code": "CSci 102",
        "title": "Discrete Structures I",
        "units": "3",
        "midterm": "—",
        "final": "—",
        "status": "inc"
      },
      {
        "code": "CSci 121",
        "title": "Computer Organization and Architecture",
        "units": "3",
        "midterm": "2.00",
        "final": "2.00",
        "status": "passed"
      },
      {
        "code": "CSci 181",
        "title": "Differential Calculus for CS",
        "units": "3",
        "midterm": "1.75",
        "final": "1.75",
        "status": "passed"
      },
      {
        "code": "Math 11",
        "title": "Mathematics in the Modern World",
        "units": "3",
        "midterm": "2.00",
        "final": "2.00",
        "status": "passed"
      },
      {
        "code": "ScSc 12",
        "title": "Readings in Philippine History",
        "units": "3",
        "midterm": "1.50",
        "final": "1.50",
        "status": "passed"
      },
      {
        "code": "Envi 11",
        "title": "Environmental Science",
        "units": "3",
        "midterm": "1.75",
        "final": "1.75",
        "status": "passed"
      },
      {
        "code": "PhEd 12",
        "title": "PATHFit 2 - Exercise-based Fitness Activities",
        "units": "2",
        "midterm": "1.00",
        "final": "1.00",
        "status": "passed"
      },
      {
        "code": "NSTP 12",
        "title": "National Service Training Program II",
        "units": "3",
        "midterm": "1.00",
        "final": "1.00",
        "status": "passed"
      },
      {
        "code": "CSci E-SC1",
        "title": "Computational Science 1",
        "units": "3",
        "midterm": "1.50",
        "final": "1.50",
        "status": "passed"
      },
      {
        "code": "CSci E-WA1",
        "title": "Web Systems and Technologies 1",
        "units": "3",
        "midterm": "1.75",
        "final": "1.75",
        "status": "passed"
      }
    ]
  }
]

export const recommendations = [
  {
    "code": "Envi 11",
    "title": "Environmental Science",
    "units": 3,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  },
  {
    "code": "CSci 126",
    "title": "Networks and Communications",
    "units": 3,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  },
  {
    "code": "CSci 154",
    "title": "Quantitative Methods for CS",
    "units": 3,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  },
  {
    "code": "CSci 183",
    "title": "Linear Algebra and Matrix Theory",
    "units": 3,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  },
  {
    "code": "Humn 11",
    "title": "Art Appreciation",
    "units": 3,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  },
  {
    "code": "ScSc 16",
    "title": "Life and Works of Rizal",
    "units": 3,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  },
  {
    "code": "PhEd 14",
    "title": "PATHFit 4",
    "units": 2,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  },
  {
    "code": "CSci 200",
    "title": "Undergraduate Thesis I",
    "units": 2,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  },
  {
    "code": "CSci 193",
    "title": "Social Issues and Professional Practice",
    "units": 3,
    "reason": "Unfulfilled requirement; strict prerequisites cleared"
  }
]

export const history = [
  {
    "date": "19 Sep 2026 09:42",
    "actor": "Prof. Ramon Reyes Adviser",
    "action": "Viewed record",
    "details": "Opened the advisee record."
  },
  {
    "date": "18 Sep 2026 16:20",
    "actor": "Prof. Ramon Reyes Adviser",
    "action": "Added note",
    "details": "Saved an advising note on the INC in CSci 102."
  },
  {
    "date": "18 Sep 2026 14:05",
    "actor": "Maria Isabel Bautista Advisee",
    "action": "Downloaded checklist",
    "details": "Exported the curriculum checklist as PDF."
  },
  {
    "date": "15 Sep 2026 10:31",
    "actor": "Prof. Ramon Reyes Adviser",
    "action": "Updated term plan",
    "details": "Added 8 courses (24 units) to the 1st Semester 2025 - 2026 plan."
  },
  {
    "date": "15 Sep 2026 09:12",
    "actor": "Maria Isabel Bautista Advisee",
    "action": "Filed grade flag",
    "details": "Flagged CSci 102 Discrete Structures I (Missing grade)."
  },
  {
    "date": "12 Sep 2026 13:48",
    "actor": "Prof. Ramon Reyes Adviser",
    "action": "Recorded enrollment",
    "details": "CSIT 103 Data Structures and Algorithms, 1st Semester 2025 - 2026."
  },
  {
    "date": "12 Sep 2026 13:46",
    "actor": "Prof. Ramon Reyes Adviser",
    "action": "Recorded enrollment",
    "details": "CSIT 104 Information Management, 1st Semester 2025 - 2026."
  },
  {
    "date": "10 Sep 2026 08:55",
    "actor": "Maria Isabel Bautista Advisee",
    "action": "Changed password",
    "details": "Password updated from the account menu."
  },
  {
    "date": "02 Sep 2026 11:17",
    "actor": "Prof. Ramon Reyes Adviser",
    "action": "Encoded grade",
    "details": "Recorded CSci 102 Discrete Structures I as INC (incomplete), 2nd Semester 2024 - 2025."
  },
  {
    "date": "02 Sep 2026 11:09",
    "actor": "Prof. Ramon Reyes Adviser",
    "action": "Encoded grade",
    "details": "CSci 181 Differential Calculus for CS: 1.75, 2nd Semester 2024 - 2025."
  },
  {
    "date": "28 Aug 2026 15:30",
    "actor": "Maria Isabel Bautista Advisee",
    "action": "Updated profile photo",
    "details": "Uploaded a new profile photo."
  },
  {
    "date": "21 Aug 2026 09:03",
    "actor": "Maria Isabel Bautista Advisee",
    "action": "Signed in",
    "details": "Student portal sign-in."
  }
]

export const student = { name: "Maria Isabel Bautista", initials: "MI", studentNumber: "2023-04412", program: "BS Computer Science", yearLabel: "2nd Year", email: "maria.bautista@example.edu.ph", standing: "good" as const }
export const advisees: { id: string; name: string; year: string; curriculum: string; gwa: string; flags: number; standing: Status; deficiencies: string }[] = [
  { id: "2023-04412", name: student.name, year: "2nd year", curriculum: "2025–present", gwa: "1.58", flags: 0, standing: "good", deficiencies: "CSci 102" },
  { id: "2022-01188", name: "Angelo Cruz", year: "3rd year", curriculum: "2022–2023", gwa: "4.50", flags: 1, standing: "flagged", deficiencies: "CSIT 101, CSci 104" },
  { id: "2023-02940", name: "Joshua Lim", year: "2nd year", curriculum: "2023–2024", gwa: "1.50", flags: 0, standing: "good", deficiencies: "CSci 102" },
  { id: "2026-00142", name: "Carlo Dominguez", year: "1st year", curriculum: "2025–2026", gwa: "—", flags: 0, standing: "good", deficiencies: "CSIT 101" },
  { id: "2024-00871", name: "Andrea Villanueva", year: "2nd year", curriculum: "2024–2025", gwa: "1.75", flags: 0, standing: "good", deficiencies: "None" },
]
export const notes = [
  { id: "n1", author: "Prof. Ramon Reyes", date: "17 Sept 2026", body: "Discussed a manageable course load. Review the CSci 102 (Discrete Structures I) completion requirements before the October deadline.", archived: false },
  { id: "n2", author: "Prof. Ramon Reyes", date: "14 Aug 2026", body: "Reviewed the CS Elective 1 mapping and explained how it appears in the curriculum checklist.", archived: false },
  { id: "n3", author: "Prof. Ramon Reyes", date: "2 Mar 2026", body: "Accepted Envi 11 as equivalent for the discontinued ScTS 11a. Student informed in person.", archived: false },
  { id: "n4", author: "Prof. Lourdes Mendez", date: "12 Jun 2024", body: "Handover to Prof. Reyes. Student is on track and prefers morning consultations.", archived: true },
  { id: "n5", author: "Prof. Lourdes Mendez", date: "20 Nov 2023", body: "Reviewed prior web application coursework for transfer credit toward CSci 135.", archived: true },
]
export const notifications = [
  { id: "ad1", title: "New grade flag from an advisee", body: "Maria Isabel Bautista flagged her grade in CSci 102.", time: "1 hour ago", unread: true, to: "/adviser/grade-flags" },
  { id: "ad2", title: "Grade import saved", body: "22 rows were saved from grades-2026-1st-sem.json. 2 rows were rejected.", time: "Yesterday", unread: true, to: "/adviser/import-grades" },
  { id: "ad3", title: "INC deadline in 14 days", body: "Ben Lopez has a pending INC in CSci 22.", time: "2 days ago", unread: false, to: "/adviser/encode-grades" },
  { id: "ad4", title: "Advisee added to your list", body: "Dino Castillo was assigned to you by the Department Head.", time: "6 days ago", unread: false, to: "/adviser/advisees" },
]

// Curriculum display fixtures shared by the nested detail page.
export const curriculumHistory = [
  { version: "BSCS 2018–2024", from: "1st Sem 2023–2024", to: "Midyear 2025", note: "Initial assignment" },
  { version: "BSCS 2025–present", from: "1st Sem 2025–2026", to: "—", note: "Transfer approved by Dr. Leo Santos, 30 Jul 2025" },
]
export const curriculumPreview = {
  target: "BSIT · 2024–2025",
  targets: ["BSCS · 2023–2024", "BSIT · 2024–2025"],
  metrics: [
    { label: "Carried units", value: "6", note: "Passed courses with matching course identities" },
    { label: "Lost units", value: "50", note: "Passed units without an automatic match" },
    { label: "Projected GWA", value: "1.63", note: "On automatically carried courses" },
  ],
}
export const gradeOptions = ["Select grade", "1.00", "1.25", "1.50", "1.75", "2.00", "2.25", "2.50", "2.75", "3.00", "5.00"]

// Static course-info dialog details from the checklist design.
export const courseInfo: Record<string, { title: string; meta: string; rows: string[][] }> = {
  "CSIT 100": {
    "title": "CSIT 100 · Introduction to Computing",
    "meta": "3 units · Major · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.50",
        "1.50",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "CSIT 101": {
    "title": "CSIT 101 · Fundamentals of Programming",
    "meta": "4 units · Major · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.75",
        "1.75",
        "—",
        "Prof. Santos"
      ]
    ]
  },
  "CSci 180": {
    "title": "CSci 180 · Pre-calculus for CS",
    "meta": "3 units · Major · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 1st Semester",
        "5.00",
        "5.00",
        "—",
        "Prof. Reyes"
      ],
      [
        "2024–2025 Midyear",
        "5.00",
        "5.00",
        "—",
        "Prof. Tan"
      ],
      [
        "2024–2025 2nd Semester",
        "2.00",
        "2.00",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "Comm 11": {
    "title": "Comm 11 · Purposive Communication",
    "meta": "3 units · GE · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.25",
        "1.25",
        "—",
        "Prof. Reyes"
      ]
    ]
  },
  "Entr 11": {
    "title": "Entr 11 · Entrepreneurial Mind",
    "meta": "3 units · GE · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.50",
        "1.50",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "ITec 11": {
    "title": "ITec 11 · Living in the IT Era",
    "meta": "3 units · GE · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.75",
        "1.75",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "ScSc 11": {
    "title": "ScSc 11 · Understanding the Self",
    "meta": "3 units · GE · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "2.00",
        "2.00",
        "—",
        "Prof. Reyes"
      ]
    ]
  },
  "PhEd 11": {
    "title": "PhEd 11 · PATHFit 1 - Movement Competency Training",
    "meta": "2 units · PE · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.00",
        "1.00",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "NSTP 11": {
    "title": "NSTP 11 · National Service Training Program I",
    "meta": "3 units · NSTP · 1st Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.00",
        "1.00",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "CSIT 102": {
    "title": "CSIT 102 · Intermediate Programming",
    "meta": "3 units · Major · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.50",
        "1.50",
        "—",
        "Prof. Reyes"
      ]
    ]
  },
  "CSci 102": {
    "title": "CSci 102 · Discrete Structures I",
    "meta": "3 units · Major · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "—",
        "INC",
        "—",
        "Prof. Santos"
      ]
    ]
  },
  "CSci 121": {
    "title": "CSci 121 · Computer Organization and Architecture",
    "meta": "3 units · Major · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "2.00",
        "2.00",
        "—",
        "Prof. Reyes"
      ]
    ]
  },
  "CSci 181": {
    "title": "CSci 181 · Differential Calculus for CS",
    "meta": "3 units · Major · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.75",
        "1.75",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "Math 11": {
    "title": "Math 11 · Mathematics in the Modern World",
    "meta": "3 units · GE · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "2.00",
        "2.00",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "ScSc 12": {
    "title": "ScSc 12 · Readings in Philippine History",
    "meta": "3 units · GE · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.50",
        "1.50",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "ScTS 11a": {
    "title": "ScTS 11a · Science, Technology, and Society",
    "meta": "3 units · GE · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.75",
        "1.75",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "Envi 11": {
    "title": "Envi 11 · Environmental Science",
    "meta": "3 units · GE · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.75",
        "1.75",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "PhEd 12": {
    "title": "PhEd 12 · PATHFit 2 - Exercise-based Fitness Activities",
    "meta": "2 units · PE · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.00",
        "1.00",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "NSTP 12": {
    "title": "NSTP 12 · National Service Training Program II",
    "meta": "3 units · NSTP · 1st Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.00",
        "1.00",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "CSIT 103": {
    "title": "CSIT 103 · Data Structures and Algorithms",
    "meta": "4 units · Major · 2nd Year, 1st Semester",
    "rows": [
      [
        "2025–2026 1st Semester",
        "—",
        "—",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "CSIT 104": {
    "title": "CSIT 104 · Information Management",
    "meta": "3 units · Major · 2nd Year, 1st Semester",
    "rows": [
      [
        "2025–2026 1st Semester",
        "—",
        "—",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "CSIT 105": {
    "title": "CSIT 105 · Applications Development and Emerging Technologies",
    "meta": "3 units · Major · 2nd Year, 1st Semester",
    "rows": [
      [
        "2025–2026 1st Semester",
        "—",
        "—",
        "—",
        "Prof. Santos"
      ]
    ]
  },
  "CSci 103": {
    "title": "CSci 103 · Discrete Structures II",
    "meta": "3 units · Major · 2nd Year, 1st Semester",
    "rows": [
      [
        "2025–2026 1st Semester",
        "—",
        "—",
        "—",
        "Prof. Reyes"
      ]
    ]
  },
  "CSci 122": {
    "title": "CSci 122 · Human Computer Interaction",
    "meta": "3 units · Major · 2nd Year, 1st Semester",
    "rows": [
      [
        "2025–2026 1st Semester",
        "—",
        "—",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "CSci 182": {
    "title": "CSci 182 · Integral Calculus for CS",
    "meta": "3 units · Major · 2nd Year, 1st Semester",
    "rows": [
      [
        "2024–2025 1st Semester",
        "5.00",
        "5.00",
        "—",
        "Prof. Villa"
      ],
      [
        "2025–2026 1st Semester",
        "—",
        "—",
        "—",
        "Prof. Santos"
      ]
    ]
  },
  "ScSc 13": {
    "title": "ScSc 13 · The Contemporary World",
    "meta": "3 units · GE · 2nd Year, 1st Semester",
    "rows": [
      [
        "2025–2026 1st Semester",
        "—",
        "—",
        "—",
        "Prof. Tan"
      ]
    ]
  },
  "PhEd 13": {
    "title": "PhEd 13 · PATHFit 3",
    "meta": "2 units · PE · 2nd Year, 1st Semester",
    "rows": [
      [
        "2025–2026 1st Semester",
        "—",
        "—",
        "—",
        "Prof. Santos"
      ]
    ]
  },
  "CSci 104": {
    "title": "CSci 104 · Algorithms and Complexity",
    "meta": "4 units · Major · 2nd Year, 2nd Semester",
    "rows": []
  },
  "CSci 126": {
    "title": "CSci 126 · Networks and Communications",
    "meta": "3 units · Major · 2nd Year, 2nd Semester",
    "rows": []
  },
  "CSci 120": {
    "title": "CSci 120 · Object-oriented Programming",
    "meta": "3 units · Major · 2nd Year, 2nd Semester",
    "rows": []
  },
  "CSci 154": {
    "title": "CSci 154 · Quantitative Methods for CS",
    "meta": "3 units · Major · 2nd Year, 2nd Semester",
    "rows": []
  },
  "CSci 183": {
    "title": "CSci 183 · Linear Algebra and Matrix Theory",
    "meta": "3 units · Major · 2nd Year, 2nd Semester",
    "rows": []
  },
  "Humn 11": {
    "title": "Humn 11 · Art Appreciation",
    "meta": "3 units · GE · 2nd Year, 2nd Semester",
    "rows": []
  },
  "ScSc 16": {
    "title": "ScSc 16 · Life and Works of Rizal",
    "meta": "3 units · GE · 2nd Year, 2nd Semester",
    "rows": []
  },
  "PhEd 14": {
    "title": "PhEd 14 · PATHFit 4",
    "meta": "2 units · PE · 2nd Year, 2nd Semester",
    "rows": []
  },
  "CSci 107": {
    "title": "CSci 107 · Automata Theory and Formal Languages",
    "meta": "3 units · Major · 3rd Year, 1st Semester",
    "rows": []
  },
  "CSci 123": {
    "title": "CSci 123 · Operating Systems",
    "meta": "3 units · Major · 3rd Year, 1st Semester",
    "rows": []
  },
  "CSci 128": {
    "title": "CSci 128 · Information Assurance and Security",
    "meta": "3 units · Major · 3rd Year, 1st Semester",
    "rows": []
  },
  "CSci 135": {
    "title": "CSci 135 · Software Engineering I",
    "meta": "3 units · Major · 3rd Year, 1st Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.75",
        "1.75",
        "—",
        "Prof. Santos"
      ]
    ]
  },
  "CSci 141": {
    "title": "CSci 141 · Artificial Intelligence",
    "meta": "3 units · Major · 3rd Year, 1st Semester",
    "rows": []
  },
  "CSci 198": {
    "title": "CSci 198 · Research Planning and Manuscript Preparation",
    "meta": "3 units · Major · 3rd Year, 1st Semester",
    "rows": []
  },
  "Phlo 11": {
    "title": "Phlo 11 · Ethics",
    "meta": "3 units · GE · 3rd Year, 1st Semester",
    "rows": []
  },
  "CSci 200": {
    "title": "CSci 200 · Undergraduate Thesis I",
    "meta": "2 units · Major · 3rd Year, 2nd Semester",
    "rows": []
  },
  "CSci 108": {
    "title": "CSci 108 · Programming Languages",
    "meta": "3 units · Major · 3rd Year, 2nd Semester",
    "rows": []
  },
  "CSci 136": {
    "title": "CSci 136 · Software Engineering II",
    "meta": "3 units · Major · 3rd Year, 2nd Semester",
    "rows": []
  },
  "CSci 193": {
    "title": "CSci 193 · Social Issues and Professional Practice",
    "meta": "3 units · Major · 3rd Year, 2nd Semester",
    "rows": []
  },
  "CS Elective 1": {
    "title": "CS Elective 1 · Open elective slot",
    "meta": "3 units · Elective · 3rd Year, 2nd Semester",
    "rows": [
      [
        "2024–2025 2nd Semester",
        "1.50",
        "1.50",
        "—",
        "Prof. Villa"
      ]
    ]
  },
  "CS Elective 2": {
    "title": "CS Elective 2 · Open elective slot",
    "meta": "3 units · Elective · 3rd Year, 3rd Semester",
    "rows": []
  },
  "CS Elective 3": {
    "title": "CS Elective 3 · Open elective slot",
    "meta": "3 units · Elective · 4th Year, 1st Semester",
    "rows": []
  },
  "CSci 199": {
    "title": "CSci 199 · Undergraduate Seminar",
    "meta": "1 units · Major · 4th Year, 1st Semester",
    "rows": []
  },
  "CSci 200-II": {
    "title": "CSci 200-II · Undergraduate Thesis II",
    "meta": "4 units · Major · 4th Year, 1st Semester",
    "rows": []
  },
  "CSci 200a": {
    "title": "CSci 200a · Internship / On-the-Job Training / Practicum",
    "meta": "3 units · Major · 4th Year, 2nd Semester",
    "rows": []
  }
}

export const gradeFlags = [{ id: "flag-1", student: "Ana Reyes", number: "23-1-01234", course: "CSci 33", grade: "mid 2.25", comment: "My midterm grade is 2.00 in the VSU system.", raised: "15 Oct 2026" }]

export const adviserGradeBands = [{ label: "1.00–1.50", percent: 34 }, { label: "1.75–2.25", percent: 41, tone: "soft" as const }, { label: "2.50–3.00", percent: 18, tone: "neutral" as const }, { label: "5.00", percent: 4, tone: "fail" as const }, { label: "INC / DR / NA", percent: 3, tone: "inc" as const }]

export const adviserBatchGwas = [{ batch: "2022", curriculum: "BSCS 2018–2024", students: 88, gwa: "1.95" }, { batch: "2023", curriculum: "BSCS 2025–present", students: 96, gwa: "2.02" }, { batch: "2024", curriculum: "BSCS 2025–present", students: 101, gwa: "2.06" }]

export const adviseeChecklistMetrics = [
        { label: "Cumulative GWA", value: "1.58", note: "Unit-weighted counted attempts" },
        { label: "Counted units", value: "56", valueSuffix: "/ 147", note: "Of 147 total units. Excludes unresolved, unexpired INC" },
        { label: "Year standing", value: "2nd year", note: "56 of 147 units earned" },
        { label: "Deficiencies", value: "1", note: "Unresolved INC: CSci 102" },
      ]
