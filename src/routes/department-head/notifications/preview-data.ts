export interface DepartmentNotificationRecord {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
  to: string
  kind: "transfer" | "alert" | "note"
}

export interface DepartmentNotificationsContext {
  notifications: DepartmentNotificationRecord[]
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
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
