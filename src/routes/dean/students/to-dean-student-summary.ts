import type { Status } from "@/components/ui/status-badge"
import type { ApiSchema } from "@/lib/api"
import type { DeanStudentSummary } from "@/routes/dean/types"

const YEAR_LABELS: Readonly<Record<number, string>> = {
  1: "1st Year",
  2: "2nd Year",
  3: "3rd Year",
  4: "4th Year",
}

function getInitials(name: string): string {
  const parts = name
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "ST"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

function mapStanding(
  item: ApiSchema<"StudentRosterItem">,
): Extract<Status, "good" | "flagged" | "delinquent"> {
  if (item.is_delinquent || item.standing === "probation" || item.standing === "dismissed") {
    return "delinquent"
  }
  if (item.standing === "warning" || item.open_flags_count > 0) {
    return "flagged"
  }
  return "good"
}

export function toDeanStudentSummary(item: ApiSchema<"StudentRosterItem">): DeanStudentSummary {
  return {
    studentId: item.student_id,
    studentNumber: item.student_number,
    name: item.full_name,
    initials: getInitials(item.full_name),
    departmentId: item.department_id,
    department: item.department_name,
    curriculum: item.curriculum_label,
    adviser: item.adviser_name ?? "Unassigned",
    program: item.program_name,
    yearLabel: YEAR_LABELS[item.year_level] ?? `${item.year_level}th Year`,
    email: item.email,
    standing: mapStanding(item),
    gwa: typeof item.gwa === "number" ? item.gwa.toFixed(2) : "—",
    unitsEarned: item.earned_units,
    unitsRequired: item.required_units,
    entryYear: item.entry_year,
  }
}
