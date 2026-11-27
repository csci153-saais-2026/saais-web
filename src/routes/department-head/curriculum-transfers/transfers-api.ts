import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import { getRoster } from "@/routes/adviser/advisees/advisees.api";

export interface TransferRequest {
  id: string;
  studentName: string;
  studentId: string;
  currentCurriculum: string;
  requestedCurriculum: string;
  adviser: string;
  submittedDate: string;
  reason: string;
}

export interface TransferDecisionHistory {
  id: string;
  studentName: string;
  studentId: string;
  currentCurriculum: string;
  requestedCurriculum: string;
  adviser: string;
  decision: "Approved" | "Rejected";
  decisionDate: string;
  decisionReason: string;
}

export const TRANSFER_QUERY_KEY = ["department-head", "transfers"] as const;
const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";

// These collection endpoints support limit/offset (contract offset maximum: 100,000).
// Read until empty so a gateway cap smaller than our requested page does not truncate data.
async function readPages<T>(
  read: (offset: number) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= 100000;) {
    const page = await read(offset);
    if (page.length === 0) return rows;
    rows.push(...page);
    offset += page.length;
  }
  throw new Error("Too many records to load. Contact your administrator.");
}

export async function getTransfers() {
  const [requests, versions, students] = await Promise.all([
    readPages((offset) =>
      apiClient
        .GET("/rest/v1/curriculum_transfer_request", {
          params: {
            query: {
              select:
                "id,student_id,from_curriculum_version_id,to_curriculum_version_id,endorsed_by,endorsed_by_name,endorsement_note,status,decided_at,decision_note,created_at",
              order: "created_at.desc,id.asc",
              limit: 100,
              offset,
            },
          },
        })
        .then(unwrapApiResult),
    ),
    readPages((offset) =>
      apiClient
        .GET("/rest/v1/curriculum_version", {
          params: {
            query: {
              select: "id,version_label",
              order: "id.asc",
              limit: 100,
              offset,
            },
          },
        })
        .then(unwrapApiResult),
    ),
    getRoster("all"),
  ]);
  // Optional joined names may be absent; resolve the actual endorser rather than the student's current adviser.
  const missingEndorsers = [
    ...new Set(
      requests
        .filter((request) => !request.endorsed_by_name)
        .map((request) => request.endorsed_by),
    ),
  ];
  const endorsers = new Map<string, string>();
  for (let index = 0; index < missingEndorsers.length; index += 50) {
    const ids = postgrestFilter.inList(
      missingEndorsers.slice(index, index + 50),
    );
    const profiles = await readPages((offset) =>
      apiClient
        .GET("/rest/v1/profile", {
          params: {
            query: {
              id: ids,
              select: "id,full_name",
              order: "id.asc",
              limit: 100,
              offset,
            },
          },
        })
        .then(unwrapApiResult),
    );
    profiles.forEach((profile) => endorsers.set(profile.id, profile.full_name));
  }
  const label = (id: string) =>
    versions.find((version) => version.id === id)?.version_label ??
    "Unknown curriculum";
  const common = (request: ApiSchema<"CurriculumTransferRequest">) => {
    const student = students.find(
      (item) => item.student_id === request.student_id,
    );
    return {
      id: request.id,
      studentName: student?.full_name ?? "Unknown student",
      studentId: student?.student_number ?? request.student_id,
      currentCurriculum: label(request.from_curriculum_version_id),
      requestedCurriculum: label(request.to_curriculum_version_id),
      adviser:
        request.endorsed_by_name ||
        endorsers.get(request.endorsed_by) ||
        "Unknown adviser",
    };
  };
  const pending: TransferRequest[] = requests
    .filter((request) => request.status === "pending")
    .map((request) => ({
      ...common(request),
      submittedDate: dateLabel(request.created_at),
      reason: request.endorsement_note,
    }));
  const history: TransferDecisionHistory[] = requests
    .filter((request) => request.status !== "pending")
    .map((request) => ({
      ...common(request),
      decision: request.status === "approved" ? "Approved" : "Rejected",
      decisionDate: dateLabel(request.decided_at),
      decisionReason: request.decision_note ?? "",
    }));
  return { pending, history };
}
