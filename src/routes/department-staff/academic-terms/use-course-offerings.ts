import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import {
  createCourseOffering,
  deleteCourseOffering,
  listCourseOfferings,
  updateCourseOffering,
  type CourseOffering,
  type CourseOfferingInsert,
  type CourseOfferingUpdate,
  type OpenedSubject,
} from "./course-offerings.api";

function courseOfferingsKey(
  profileId: string,
  departmentId: string,
  schoolTermId: string,
) {
  return staffQueryKeys.resource(profileId, departmentId, "course-offerings", {
    schoolTermId,
  });
}

function sameOffering(
  current: CourseOffering,
  original: CourseOffering,
): boolean {
  return (
    current.id === original.id &&
    current.school_term_id === original.school_term_id &&
    current.course_id === original.course_id &&
    (current.section ?? null) === (original.section ?? null) &&
    (current.schedule ?? null) === (original.schedule ?? null) &&
    (current.instructor ?? null) === (original.instructor ?? null) &&
    current.is_by_request === original.is_by_request
  );
}

function matchesCreate(
  offering: CourseOffering,
  body: CourseOfferingInsert,
): boolean {
  return (
    Boolean(offering.id) &&
    offering.school_term_id === body.school_term_id &&
    offering.course_id === body.course_id &&
    (offering.section ?? null) === (body.section ?? null) &&
    (offering.schedule ?? null) === (body.schedule ?? null) &&
    (offering.instructor ?? null) === (body.instructor ?? null) &&
    offering.is_by_request === body.is_by_request
  );
}

function matchesUpdate(
  offering: CourseOffering,
  body: CourseOfferingUpdate,
): boolean {
  return (
    Boolean(offering.id) &&
    (body.section === undefined ||
      (offering.section ?? null) === (body.section ?? null)) &&
    (body.schedule === undefined ||
      (offering.schedule ?? null) === (body.schedule ?? null)) &&
    (body.instructor === undefined ||
      (offering.instructor ?? null) === (body.instructor ?? null)) &&
    (body.is_by_request === undefined ||
      offering.is_by_request === body.is_by_request)
  );
}

function cachedOffering(
  queryClient: ReturnType<typeof useQueryClient>,
  profileId: string,
  departmentId: string,
  schoolTermId: string,
  original: CourseOffering,
): OpenedSubject {
  const rows = queryClient.getQueryData<OpenedSubject[]>(
    courseOfferingsKey(profileId, departmentId, schoolTermId),
  );
  const current = rows?.find((row) => row.offering.id === original.id);
  if (!current || !sameOffering(current.offering, original)) {
    throw new Error(
      "This course offering changed or is no longer available. Refresh the term offerings and try again.",
    );
  }
  return current;
}

function useCourseOfferingWrite() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();

  async function refresh(
    profileId: string,
    departmentId: string,
    schoolTermId: string,
  ) {
    await queryClient.invalidateQueries({
      queryKey: courseOfferingsKey(profileId, departmentId, schoolTermId),
    });
  }

  return { scope, queryClient, refresh };
}

type CourseOfferingWriteContext =
  | {
      profileId: string;
      departmentId: string;
      schoolTermId: string;
    }
  | undefined;

export function useCourseOfferings(schoolTermId: string | undefined) {
  const scope = useStaffScope();
  const activeScope = scope.status === "ready" ? scope : null;

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? "",
      activeScope?.departmentId ?? "",
      "course-offerings",
      { schoolTermId },
    ),
    enabled: activeScope !== null && schoolTermId !== undefined,
    retry: false,
    queryFn: ({ signal }) => {
      if (!activeScope || !schoolTermId) {
        throw new Error(
          "Course offering requests require an authorized department and school term.",
        );
      }

      return listCourseOfferings(schoolTermId, signal);
    },
  });
}

export function useCreateCourseOffering() {
  const { scope, refresh } = useCourseOfferingWrite();

  return useMutation<
    {
      offering: CourseOffering;
      profileId: string;
      departmentId: string;
      schoolTermId: string;
    },
    unknown,
    CourseOfferingInsert,
    CourseOfferingWriteContext
  >({
    retry: false,
    mutationFn: async (body: CourseOfferingInsert) => {
      if (scope.status !== "ready") {
        throw new Error(
          "An authorized department is required to manage course offerings.",
        );
      }

      const offering = await createCourseOffering(body);
      if (!matchesCreate(offering, body)) {
        throw new Error(
          "The service returned an unexpected course offering. Refresh the selected term before continuing.",
        );
      }

      return {
        offering,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
        schoolTermId: body.school_term_id,
      };
    },
    onSuccess: async ({ profileId, departmentId, schoolTermId }) => {
      await refresh(profileId, departmentId, schoolTermId);
    },
    onError: async (_error, body, context) => {
      if (context) {
        await refresh(
          context.profileId,
          context.departmentId,
          context.schoolTermId,
        );
      } else if (scope.status === "ready") {
        await refresh(scope.profileId, scope.departmentId, body.school_term_id);
      }
    },
    onMutate: (body) =>
      scope.status === "ready"
        ? {
            profileId: scope.profileId,
            departmentId: scope.departmentId,
            schoolTermId: body.school_term_id,
          }
        : undefined,
  });
}

export function useUpdateCourseOffering() {
  const { scope, queryClient, refresh } = useCourseOfferingWrite();

  return useMutation<
    {
      offering: CourseOffering;
      profileId: string;
      departmentId: string;
      schoolTermId: string;
    },
    unknown,
    { original: CourseOffering; body: CourseOfferingUpdate },
    CourseOfferingWriteContext
  >({
    retry: false,
    mutationFn: async ({
      original,
      body,
    }: {
      original: CourseOffering;
      body: CourseOfferingUpdate;
    }) => {
      if (scope.status !== "ready") {
        throw new Error(
          "An authorized department is required to manage course offerings.",
        );
      }

      cachedOffering(
        queryClient,
        scope.profileId,
        scope.departmentId,
        original.school_term_id,
        original,
      );
      const offering = await updateCourseOffering(original.id, body);
      if (
        offering.id !== original.id ||
        offering.school_term_id !== original.school_term_id ||
        offering.course_id !== original.course_id ||
        !matchesUpdate(offering, body)
      ) {
        throw new Error(
          "The service returned an unexpected course offering. Refresh the selected term before continuing.",
        );
      }

      return {
        offering,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
        schoolTermId: original.school_term_id,
      };
    },
    onSuccess: async ({ profileId, departmentId, schoolTermId }) => {
      await refresh(profileId, departmentId, schoolTermId);
    },
    onError: async (_error, change, context) => {
      if (context) {
        await refresh(
          context.profileId,
          context.departmentId,
          context.schoolTermId,
        );
      } else if (scope.status === "ready") {
        await refresh(
          scope.profileId,
          scope.departmentId,
          change.original.school_term_id,
        );
      }
    },
    onMutate: (change) =>
      scope.status === "ready"
        ? {
            profileId: scope.profileId,
            departmentId: scope.departmentId,
            schoolTermId: change.original.school_term_id,
          }
        : undefined,
  });
}

export function useDeleteCourseOffering() {
  const { scope, queryClient, refresh } = useCourseOfferingWrite();

  return useMutation<
    { profileId: string; departmentId: string; schoolTermId: string },
    unknown,
    CourseOffering,
    CourseOfferingWriteContext
  >({
    retry: false,
    mutationFn: async (original: CourseOffering) => {
      if (scope.status !== "ready") {
        throw new Error(
          "An authorized department is required to manage course offerings.",
        );
      }

      cachedOffering(
        queryClient,
        scope.profileId,
        scope.departmentId,
        original.school_term_id,
        original,
      );
      await deleteCourseOffering(original.id);
      return {
        profileId: scope.profileId,
        departmentId: scope.departmentId,
        schoolTermId: original.school_term_id,
      };
    },
    onSuccess: async ({ profileId, departmentId, schoolTermId }) => {
      await refresh(profileId, departmentId, schoolTermId);
    },
    onError: async (_error, original, context) => {
      if (context) {
        await refresh(
          context.profileId,
          context.departmentId,
          context.schoolTermId,
        );
      } else if (scope.status === "ready") {
        await refresh(
          scope.profileId,
          scope.departmentId,
          original.school_term_id,
        );
      }
    },
    onMutate: (original) =>
      scope.status === "ready"
        ? {
            profileId: scope.profileId,
            departmentId: scope.departmentId,
            schoolTermId: original.school_term_id,
          }
        : undefined,
  });
}
