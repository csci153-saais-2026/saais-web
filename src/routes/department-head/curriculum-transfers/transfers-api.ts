import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"
import { getRoster } from "@/routes/adviser/advisees/advisees.api"

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

const KEY = ["department-head", "transfers"] as const
const dateLabel = (value?: string | null) => value
  ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  : "—"

async function getTransfers() {
  const [requests, versions, students] = await Promise.all([
    apiClient.GET("/rest/v1/curriculum_transfer_request", { params: { query: { select: "*", order: "created_at.desc", limit: 100 } } }).then(unwrapApiResult),
    apiClient.GET("/rest/v1/curriculum_version", { params: { query: { select: "*", limit: 100 } } }).then(unwrapApiResult),
    getRoster("all"),
  ])
  const label = (id: string) => versions.find((version) => version.id === id)?.version_label ?? "Unknown curriculum"
  const common = (request: ApiSchema<"CurriculumTransferRequest">) => {
    const student = students.find((item) => item.student_id === request.student_id)
    return {
      id: request.id,
      studentName: student?.full_name ?? "Unknown student",
      studentId: student?.student_number ?? request.student_id,
      currentCurriculum: label(request.from_curriculum_version_id),
      requestedCurriculum: label(request.to_curriculum_version_id),
      adviser: request.endorsed_by_name ?? "Unknown adviser",
    }
  }
  const pending: TransferRequest[] = requests.filter((request) => request.status === "pending").map((request) => ({
    ...common(request), submittedDate: dateLabel(request.created_at), reason: request.endorsement_note,
  }))
  const history: TransferDecisionHistory[] = requests.filter((request) => request.status !== "pending").map((request) => ({
    ...common(request),
    decision: request.status === "approved" ? "Approved" : "Rejected",
    decisionDate: dateLabel(request.decided_at),
    decisionReason: request.decision_note ?? "",
  }))
  return { pending, history }
}

export const useTransfers = () => useQuery({ queryKey: KEY, queryFn: getTransfers })

export function useDecideTransfer() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, decision, note }: { id: string; decision: "approved" | "rejected"; note: string }) =>
      unwrapApiResult(await apiClient.POST("/functions/v1/curriculum-transfers/{transfer_id}/decision", {
        params: { path: { transfer_id: id } },
        body: decision === "approved"
          ? { decision, ...(note ? { decision_note: note } : {}) }
          : { decision, decision_note: note },
      })),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: KEY }),
      client.invalidateQueries({ queryKey: ["department-head", "students"] }),
    ]),
  })
}
