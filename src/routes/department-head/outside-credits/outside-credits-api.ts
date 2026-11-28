import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api";
import { getRoster } from "@/routes/adviser/advisees/advisees.api";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";

export interface OutsideCreditRecord {
  id: string;
  studentUuid: string;
  studentName: string;
  studentId: string;
  originalCode: string;
  originalTitle: string;
  originalUnits: number;
  originSchool: string;
  grade: string;
  slotId: string;
  equivalentCode: string;
  equivalentTitle: string;
  equivalentUnits: number;
  targetCurriculum: string;
  entryType: "Transferee" | "Shiftee";
  unitsCredited: number;
}

export interface CreditStudentOption {
  id: string;
  name: string;
  studentNumber: string;
  curriculumId: string;
  curriculumLabel: string;
}

export interface DestinationSlot {
  id: string;
  code: string;
  title: string;
  units: number;
  curriculumId: string;
}

export interface NewOutsideCredit {
  studentId: string;
  entryType: "Transferee" | "Shiftee";
  originalCode: string;
  originalTitle: string;
  originalUnits: number;
  originSchool: string;
  grade: string;
  slotId: string;
  reason: string;
}

const KEY = ["department-head", "outside-credits"] as const;

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

async function readBatches<T>(
  ids: readonly string[],
  read: (filter: string, offset: number) => Promise<T[]>,
): Promise<T[]> {
  const uniqueIds = [...new Set(ids)];
  const rows: T[] = [];
  for (let start = 0; start < uniqueIds.length; start += 50) {
    const filter = postgrestFilter.inList(uniqueIds.slice(start, start + 50));
    rows.push(...(await readPages((offset) => read(filter, offset))));
  }
  return rows;
}

export async function getOutsideCredits() {
  const roster = await getRoster("all");
  const [credits, currentTerms] = await Promise.all([
    readBatches(
      roster.map((student) => student.student_id),
      (student_id, offset) =>
        apiClient
          .GET("/rest/v1/outside_credit", {
            params: {
              query: {
                student_id,
                select:
                  "id,student_id,entry_type,origin_school,original_course_code,original_course_title,units,grade,destination_curriculum_term_course_id,units_credited,revoked_at,decided_at",
                order: "decided_at.desc,id.asc",
                limit: 100,
                offset,
              },
            },
          })
          .then(unwrapApiResult),
    ),
    readBatches(
      roster.map((student) => student.curriculum_version_id),
      (curriculum_version_id, offset) =>
        apiClient
          .GET("/rest/v1/curriculum_term", {
            params: {
              query: {
                curriculum_version_id,
                select: "id,curriculum_version_id",
                order: "id.asc",
                limit: 100,
                offset,
              },
            },
          })
          .then(unwrapApiResult),
    ),
  ]);
  const activeCredits = credits
    .filter((credit) => !credit.revoked_at)
    .sort(
      (left, right) =>
        Date.parse(right.decided_at) - Date.parse(left.decided_at) ||
        left.id.localeCompare(right.id),
    );
  const readSlots = (
    ids: readonly string[],
    field: "id" | "curriculum_term_id",
  ) =>
    readBatches(ids, (filter, offset) =>
      apiClient
        .GET("/rest/v1/curriculum_term_course", {
          params: {
            query: {
              [field]: filter,
              select: "id,curriculum_term_id,course_id,nominal_units",
              order: "id.asc",
              limit: 100,
              offset,
            },
          },
        })
        .then(unwrapApiResult),
    );
  const currentSlots = await readSlots(
    currentTerms.map((term) => term.id),
    "curriculum_term_id",
  );
  const knownSlots = new Set(currentSlots.map((slot) => slot.id));
  const historicalSlots = await readSlots(
    activeCredits
      .map((credit) => credit.destination_curriculum_term_course_id)
      .filter((id) => !knownSlots.has(id)),
    "id",
  );
  const slots = [...currentSlots, ...historicalSlots];
  const termIds = new Set(currentTerms.map((term) => term.id));
  const [courses, historicalTerms] = await Promise.all([
    readBatches(
      slots.map((slot) => slot.course_id),
      (id, offset) =>
        apiClient
          .GET("/rest/v1/course", {
            params: {
              query: {
                id,
                select: "id,code,title",
                order: "id.asc",
                limit: 100,
                offset,
              },
            },
          })
          .then(unwrapApiResult),
    ),
    readBatches(
      historicalSlots
        .map((slot) => slot.curriculum_term_id)
        .filter((id) => !termIds.has(id)),
      (id, offset) =>
        apiClient
          .GET("/rest/v1/curriculum_term", {
            params: {
              query: {
                id,
                select: "id,curriculum_version_id",
                order: "id.asc",
                limit: 100,
                offset,
              },
            },
          })
          .then(unwrapApiResult),
    ),
  ]);
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const termById = new Map(
    [...currentTerms, ...historicalTerms].map((term) => [term.id, term]),
  );
  const students: CreditStudentOption[] = roster.map((student) => ({
    id: student.student_id,
    name: student.full_name,
    studentNumber: student.student_number,
    curriculumId: student.curriculum_version_id,
    curriculumLabel: student.curriculum_label,
  }));
  const destinationSlots: DestinationSlot[] = slots.flatMap((slot) => {
    const course = courseById.get(slot.course_id);
    const term = termById.get(slot.curriculum_term_id);
    return course && term
      ? [
          {
            id: slot.id,
            code: course.code,
            title: course.title,
            units: slot.nominal_units,
            curriculumId: term.curriculum_version_id,
          },
        ]
      : [];
  });
  const studentById = new Map(students.map((student) => [student.id, student]));
  const slotById = new Map(destinationSlots.map((slot) => [slot.id, slot]));
  const records = activeCredits.flatMap((credit): OutsideCreditRecord[] => {
    const student = studentById.get(credit.student_id);
    const slot = slotById.get(credit.destination_curriculum_term_course_id);
    if (!student) return [];
    return [
      {
        id: credit.id,
        studentUuid: student.id,
        studentName: student.name,
        studentId: student.studentNumber,
        originalCode: credit.original_course_code,
        originalTitle: credit.original_course_title,
        originalUnits: credit.units,
        originSchool: credit.origin_school,
        grade: credit.grade,
        slotId: credit.destination_curriculum_term_course_id,
        equivalentCode: slot?.code ?? "—",
        equivalentTitle: slot?.title ?? "Curriculum slot",
        equivalentUnits: credit.units_credited,
        targetCurriculum: student.curriculumLabel,
        entryType:
          credit.entry_type === "transferee" ? "Transferee" : "Shiftee",
        unitsCredited: credit.units_credited,
      },
    ];
  });
  return { records, students, slots: destinationSlots };
}

export const useOutsideCredits = () =>
  useQuery({
    queryKey: useDepartmentHeadQueryKey(KEY),
    queryFn: getOutsideCredits,
  });

export function useCreditCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (credit: NewOutsideCredit) =>
      unwrapApiResult(
        await apiClient.POST(
          "/functions/v1/students/{student_id}/outside-credits",
          {
            params: { path: { student_id: credit.studentId } },
            body: {
              entry_type:
                credit.entryType === "Transferee" ? "transferee" : "shiftee",
              origin_school: credit.originSchool,
              original_course_code: credit.originalCode,
              original_course_title: credit.originalTitle,
              units: credit.originalUnits,
              grade: credit.grade,
              destination_curriculum_term_course_id: credit.slotId,
              reason: credit.reason,
            },
          },
        ),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
