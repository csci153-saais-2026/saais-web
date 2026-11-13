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
