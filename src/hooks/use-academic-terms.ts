import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import {
  closeSchoolTermEncoding,
  createSchoolTerm,
  listAcademicTerms,
  reopenDepartmentTermEncoding,
  updateSchoolTerm,
  type AcademicTermsData,
  type SchoolTerm,
  type SchoolTermCloseEncodingRequest,
  type SchoolTermInsert,
  type SchoolTermUpdate,
} from "@/routes/department-staff/academic-terms/academic-terms.api";
import {
  schoolTermFormSchema,
  schoolTermInsertRequest,
  schoolTermUpdateRequest,
  type SchoolTermFormValues,
} from "@/routes/department-staff/academic-terms/school-term.schema";

function academicTermsQueryKey(profileId: string, departmentId: string) {
  return staffQueryKeys.resource(profileId, departmentId, "academic-terms");
}

function sameEditableTerm(current: SchoolTerm, original: SchoolTerm): boolean {
  return (
    current.start_year === original.start_year &&
    current.end_year === original.end_year &&
    current.term_type === original.term_type &&
    (current.starts_on ?? null) === (original.starts_on ?? null) &&
    current.ends_on === original.ends_on &&
    (current.encoding_deadline ?? null) === (original.encoding_deadline ?? null)
  );
}

function matchesWrite(
  term: SchoolTerm,
  body: SchoolTermInsert | SchoolTermUpdate,
): boolean {
  return (
    term.start_year === body.start_year &&
    term.end_year === body.end_year &&
    term.term_type === body.term_type &&
    (term.starts_on ?? null) === (body.starts_on ?? null) &&
    term.ends_on === body.ends_on &&
    (term.encoding_deadline ?? null) === (body.encoding_deadline ?? null)
  );
}

function useAcademicTermWrite() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();

  async function refreshAcademicTerms(profileId: string, departmentId: string) {
    await queryClient.invalidateQueries({
      queryKey: academicTermsQueryKey(profileId, departmentId),
    });
  }

  return { scope, queryClient, refreshAcademicTerms };
}

export function useAcademicTerms() {
  const scope = useStaffScope();
  const activeScope = scope.status === "ready" ? scope : null;

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? "",
      activeScope?.departmentId ?? "",
      "academic-terms",
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) {
        throw new Error(
          "Academic term requests require an authorized department scope.",
        );
      }

      return listAcademicTerms(activeScope.departmentId, signal);
    },
    enabled: activeScope !== null,
    retry: false,
  });
}

export function useCreateSchoolTerm() {
  const { scope, refreshAcademicTerms } = useAcademicTermWrite();

  return useMutation({
    retry: false,
    mutationFn: async (values: SchoolTermFormValues) => {
      if (scope.status !== "ready") {
        throw new Error(
          "An authorized department is required to create a school term.",
        );
      }

      const parsed = schoolTermFormSchema.parse(values);
      const body = schoolTermInsertRequest(parsed);
      const term = await createSchoolTerm(body);
      if (!term.id || !matchesWrite(term, body)) {
        throw new Error(
          "The service returned an unexpected school term. Refresh the term list before continuing.",
        );
      }

      return {
        term,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ profileId, departmentId }) => {
      await refreshAcademicTerms(profileId, departmentId);
    },
    onError: async (_error, _values, context) => {
      if (context) {
        await refreshAcademicTerms(context.profileId, context.departmentId);
      }
    },
    onMutate: () =>
      scope.status === "ready"
        ? { profileId: scope.profileId, departmentId: scope.departmentId }
        : undefined,
  });
}

export function useUpdateSchoolTerm() {
  const { scope, queryClient, refreshAcademicTerms } = useAcademicTermWrite();

  return useMutation({
    retry: false,
    mutationFn: async ({
      original,
      values,
    }: {
      original: SchoolTerm;
      values: SchoolTermFormValues;
    }) => {
      if (scope.status !== "ready") {
        throw new Error(
          "An authorized department is required to edit a school term.",
        );
      }

      const parsed = schoolTermFormSchema.parse(values);
      const queryKey = academicTermsQueryKey(
        scope.profileId,
        scope.departmentId,
      );
      const data = queryClient.getQueryData<AcademicTermsData>(queryKey);
      const current = data?.terms.find((term) => term.id === original.id);
      if (!current) {
        throw new Error(
          "This school term is no longer available. Refresh the term list and try again.",
        );
      }
      if (!sameEditableTerm(current, original)) {
        throw new Error(
          "This school term changed while the form was open. Close it and review the refreshed term.",
        );
      }

      const body = schoolTermUpdateRequest(parsed);
      const term = await updateSchoolTerm(original.id, body);
      if (term.id !== original.id || !matchesWrite(term, body)) {
        throw new Error(
          "The service returned an unexpected school term. Refresh the term list before continuing.",
        );
      }

      return {
        term,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ profileId, departmentId }) => {
      await refreshAcademicTerms(profileId, departmentId);
    },
    onError: async (_error, _change, context) => {
      if (context) {
        await refreshAcademicTerms(context.profileId, context.departmentId);
      }
    },
    onMutate: () =>
      scope.status === "ready"
        ? { profileId: scope.profileId, departmentId: scope.departmentId }
        : undefined,
  });
}

export function useCloseAcademicTermEncoding() {
  const { scope, queryClient, refreshAcademicTerms } = useAcademicTermWrite();

  return useMutation({
    retry: false,
    mutationFn: async ({
      term,
      closureNote,
    }: {
      term: SchoolTerm;
      closureNote: string | null;
    }) => {
      if (scope.status !== "ready") {
        throw new Error(
          "An authorized department is required to close grade encoding.",
        );
      }

      const queryKey = academicTermsQueryKey(
        scope.profileId,
        scope.departmentId,
      );
      const data = queryClient.getQueryData<AcademicTermsData>(queryKey);
      const current = data?.terms.find((item) => item.id === term.id);
      if (
        !current ||
        current.school_year !== term.school_year ||
        current.term_type !== term.term_type ||
        current.is_locked !== term.is_locked
      ) {
        throw new Error(
          "This school term changed or is no longer available. Refresh the term list and try again.",
        );
      }

      const currentClosure = data?.departmentClosures.find(
        (closure) =>
          closure.school_term_id === term.id &&
          closure.department_id === scope.departmentId,
      );
      if (currentClosure?.is_closed) {
        throw new Error(
          "Department grade encoding is already closed for this term. Refresh the term list.",
        );
      }

      const body: SchoolTermCloseEncodingRequest = {
        scope: "department",
        department_id: scope.departmentId,
        closure_note: closureNote,
      };
      const updated = await closeSchoolTermEncoding(term.id, body);
      if (updated.id !== term.id || updated.is_locked !== current.is_locked) {
        throw new Error(
          "The service returned an unexpected term status. Refresh the term list before continuing.",
        );
      }

      return {
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ profileId, departmentId }) => {
      await refreshAcademicTerms(profileId, departmentId);
    },
    onError: async (_error, _change, context) => {
      if (context) {
        await refreshAcademicTerms(context.profileId, context.departmentId);
      }
    },
    onMutate: () =>
      scope.status === "ready"
        ? { profileId: scope.profileId, departmentId: scope.departmentId }
        : undefined,
  });
}

export function useReopenAcademicTermEncoding() {
  const { scope, queryClient, refreshAcademicTerms } = useAcademicTermWrite();

  return useMutation({
    retry: false,
    mutationFn: async ({ term }: { term: SchoolTerm }) => {
      if (scope.status !== "ready") {
        throw new Error(
          "An authorized department is required to reopen grade encoding.",
        );
      }

      const queryKey = academicTermsQueryKey(
        scope.profileId,
        scope.departmentId,
      );
      const data = queryClient.getQueryData<AcademicTermsData>(queryKey);
      const current = data?.terms.find((item) => item.id === term.id);
      if (
        !current ||
        current.school_year !== term.school_year ||
        current.term_type !== term.term_type ||
        current.is_locked !== term.is_locked
      ) {
        throw new Error(
          "This school term changed or is no longer available. Refresh the term list and try again.",
        );
      }

      const currentClosure = data?.departmentClosures.find(
        (closure) =>
          closure.school_term_id === term.id &&
          closure.department_id === scope.departmentId,
      );
      if (!currentClosure?.is_closed) {
        throw new Error(
          "Department grade encoding is not closed for this term. Refresh the term list.",
        );
      }

      const updated = await reopenDepartmentTermEncoding(term.id, {
        scope: "department",
        department_id: scope.departmentId,
      });
      if (
        updated.school_term_id !== term.id ||
        updated.department_id !== scope.departmentId ||
        updated.is_closed
      ) {
        throw new Error(
          "The service did not confirm that department encoding was reopened. Refresh the term list before continuing.",
        );
      }

      return {
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ profileId, departmentId }) => {
      await refreshAcademicTerms(profileId, departmentId);
    },
    onError: async (_error, _change, context) => {
      if (context) {
        await refreshAcademicTerms(context.profileId, context.departmentId);
      }
    },
    onMutate: () =>
      scope.status === "ready"
        ? { profileId: scope.profileId, departmentId: scope.departmentId }
        : undefined,
  });
}
