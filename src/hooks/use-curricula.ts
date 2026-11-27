import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import {
  createCurriculumSlot,
  createCurriculumTerm,
  createCurriculumVersion,
  deleteCurriculumSlot,
  deleteCurriculumTerm,
  deleteCurriculumVersion,
  listCurricula,
  listCurriculumCourses,
  readCurriculum,
  updateCurriculumSlot,
  updateCurriculumTerm,
  updateCurriculumVersion,
  type Course,
  type CurriculumSlot,
  type CurriculumTerm,
  type CurriculumVersion,
} from "@/routes/department-staff/curricula/curricula.api";
import {
  blankVersionRequest,
  versionUpdateRequest,
  type CurriculumVersionValues,
} from "@/routes/department-staff/curricula/curriculum-version.schema";
import {
  curriculumTermSchema,
  type CurriculumTermValues,
} from "@/routes/department-staff/curricula/curriculum-term.schema";
import {
  curriculumSlotRequest,
  curriculumSlotSchema,
  curriculumSlotUpdateRequest,
  type CurriculumSlotValues,
} from "@/routes/department-staff/curricula/curriculum-slot.schema";

type TermChange = { original: CurriculumTerm } & (
  { action: "edit"; values: CurriculumTermValues } | { action: "delete" }
);

export function useManageCurriculumTerm() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (change: TermChange) => {
      if (scope.status !== "ready")
        throw new Error(
          "An authorized department is required to manage curriculum terms.",
        );
      const versionId = change.original.curriculum_version_id;
      const key = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curricula",
      );
      const catalog =
        queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(
          key,
        );
      const version = catalog?.versions.find((item) => item.id === versionId);
      if (
        !version ||
        !catalog?.programs.some(
          (program) =>
            program.id === version.program_id &&
            program.department_id === scope.departmentId,
        )
      ) {
        throw new Error(
          "This version is no longer available in your authorized department. Refresh the list.",
        );
      }
      const detailKey = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curriculum-overview",
        { versionId },
      );
      const detail =
        queryClient.getQueryData<Awaited<ReturnType<typeof readCurriculum>>>(
          detailKey,
        );
      const current = detail?.terms.find(
        (term) =>
          term.id === change.original.id &&
          term.curriculum_version_id === versionId,
      );
      if (!current)
        throw new Error(
          "This term is no longer available in the selected curriculum. Refresh its requirements.",
        );
      if (
        current.year_level !== change.original.year_level ||
        current.term_sequence !== change.original.term_sequence
      ) {
        throw new Error(
          "This term changed while the dialog was open. Close it and review the refreshed position.",
        );
      }
      let updated: CurriculumTerm | undefined;
      if (change.action === "edit") {
        const values = curriculumTermSchema.parse(change.values);
        if (
          detail!.terms.some(
            (term) =>
              term.id !== current.id &&
              term.year_level === values.year_level &&
              term.term_sequence === values.term_sequence,
          )
        ) {
          throw new Error(
            "This year and term position already exists in the selected curriculum.",
          );
        }
        updated = await updateCurriculumTerm(current.id, values);
        if (
          updated?.id !== current.id ||
          updated.curriculum_version_id !== versionId ||
          updated.year_level !== values.year_level ||
          updated.term_sequence !== values.term_sequence
        ) {
          throw new Error(
            "The update result could not be confirmed. Refresh the curriculum before submitting again.",
          );
        }
      } else {
        // No frontend cascade: the server decides history and last-term eligibility.
        await deleteCurriculumTerm(current.id);
      }
      return {
        action: change.action,
        id: current.id,
        updated,
        versionId,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({
      action,
      id,
      updated,
      versionId,
      profileId,
      departmentId,
    }) => {
      const detailKey = staffQueryKeys.resource(
        profileId,
        departmentId,
        "curriculum-overview",
        { versionId },
      );
      await queryClient.cancelQueries({ queryKey: detailKey });
      queryClient.setQueryData<Awaited<ReturnType<typeof readCurriculum>>>(
        detailKey,
        (detail) => {
          if (!detail) return detail;
          const terms =
            action === "delete"
              ? detail.terms.filter((term) => term.id !== id)
              : detail.terms.map((term) => (term.id === id ? updated! : term));
          return {
            ...detail,
            terms: [...terms].sort(
              (a, b) =>
                a.year_level - b.year_level ||
                a.term_sequence - b.term_sequence ||
                a.id.localeCompare(b.id),
            ),
            slots:
              action === "delete"
                ? detail.slots.filter((slot) => slot.curriculum_term_id !== id)
                : detail.slots,
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "curricula",
          ),
        }),
      ]);
    },
  });
}

export function useCreateCurriculumTerm() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({
      versionId,
      values,
    }: {
      versionId: string;
      values: CurriculumTermValues;
    }) => {
      if (scope.status !== "ready")
        throw new Error(
          "An authorized department is required to add a curriculum term.",
        );
      const key = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curricula",
      );
      const catalog =
        queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(
          key,
        );
      const version = catalog?.versions.find((item) => item.id === versionId);
      if (
        !version ||
        !catalog?.programs.some(
          (program) =>
            program.id === version.program_id &&
            program.department_id === scope.departmentId,
        )
      ) {
        throw new Error(
          "This version is no longer available in your authorized department. Refresh the list.",
        );
      }
      const detailKey = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curriculum-overview",
        { versionId },
      );
      const detail =
        queryClient.getQueryData<Awaited<ReturnType<typeof readCurriculum>>>(
          detailKey,
        );
      if (!detail)
        throw new Error(
          "Load the selected curriculum requirements before adding a term.",
        );
      const position = curriculumTermSchema.parse(values);
      if (
        detail.terms.some(
          (term) =>
            term.year_level === position.year_level &&
            term.term_sequence === position.term_sequence,
        )
      ) {
        throw new Error(
          "This year and term position already exists in the selected curriculum.",
        );
      }
      // Empty terms are approved for Step 22. No requirement-slot writes are made.
      const term = await createCurriculumTerm({
        curriculum_version_id: versionId,
        ...position,
        slots: [],
      });
      if (
        !term?.id ||
        term.curriculum_version_id !== versionId ||
        term.year_level !== position.year_level ||
        term.term_sequence !== position.term_sequence
      ) {
        throw new Error(
          "The term creation result could not be confirmed. Refresh the curriculum before submitting again.",
        );
      }
      return {
        term,
        versionId,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ term, versionId, profileId, departmentId }) => {
      const detailKey = staffQueryKeys.resource(
        profileId,
        departmentId,
        "curriculum-overview",
        { versionId },
      );
      queryClient.setQueryData<Awaited<ReturnType<typeof readCurriculum>>>(
        detailKey,
        (detail) => {
          if (!detail) return detail;
          return {
            ...detail,
            terms: [
              ...detail.terms.filter((item) => item.id !== term.id),
              term,
            ].sort(
              (a, b) =>
                a.year_level - b.year_level ||
                a.term_sequence - b.term_sequence ||
                a.id.localeCompare(b.id),
            ),
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "curricula",
          ),
        }),
      ]);
    },
  });
}

export function useCreateCurriculumSlot() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({
      term,
      values,
    }: {
      term: CurriculumTerm;
      values: CurriculumSlotValues;
    }) => {
      if (scope.status !== "ready")
        throw new Error(
          "An authorized department is required to add a curriculum requirement.",
        );
      const versionId = term.curriculum_version_id;
      const catalogKey = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curricula",
      );
      const catalog =
        queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(
          catalogKey,
        );
      const version = catalog?.versions.find((item) => item.id === versionId);
      if (
        !version ||
        !catalog?.programs.some(
          (program) =>
            program.id === version.program_id &&
            program.department_id === scope.departmentId,
        )
      ) {
        throw new Error(
          "This version is no longer available in your authorized department. Refresh the list.",
        );
      }
      const detailKey = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curriculum-overview",
        { versionId },
      );
      const detail =
        queryClient.getQueryData<Awaited<ReturnType<typeof readCurriculum>>>(
          detailKey,
        );
      const current = detail?.terms.find(
        (item) =>
          item.id === term.id && item.curriculum_version_id === versionId,
      );
      if (
        !current ||
        current.year_level !== term.year_level ||
        current.term_sequence !== term.term_sequence
      ) {
        throw new Error(
          "This term changed while the dialog was open. Close it and review the refreshed term.",
        );
      }
      const parsed = curriculumSlotSchema.parse(values);
      const fixedCourse =
        parsed.slot_type === "required" ||
        parsed.slot_type === "pe" ||
        parsed.slot_type === "nstp";
      const coursesKey = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curriculum-course-options",
      );
      const courses = queryClient.getQueryData<Course[]>(coursesKey) ?? [];
      const course = fixedCourse
        ? courses.find(
            (item) =>
              item.id === parsed.course_id &&
              item.department_id === scope.departmentId &&
              item.status === "active",
          )
        : undefined;
      if (fixedCourse && parsed.course_id && !course)
        throw new Error(
          "Select an active course from your department catalog and retry.",
        );
      const request = curriculumSlotRequest(term.id, parsed);
      const slot = await createCurriculumSlot(request);
      if (!slot?.id || slot.curriculum_term_id !== term.id) {
        throw new Error(
          "The requirement creation result could not be confirmed. Refresh the curriculum before submitting again.",
        );
      }
      return {
        slot,
        course,
        versionId,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ slot, course, versionId, profileId, departmentId }) => {
      const detailKey = staffQueryKeys.resource(
        profileId,
        departmentId,
        "curriculum-overview",
        { versionId },
      );
      await queryClient.cancelQueries({ queryKey: detailKey });
      queryClient.setQueryData<Awaited<ReturnType<typeof readCurriculum>>>(
        detailKey,
        (detail) => {
          if (!detail) return detail;
          return {
            ...detail,
            slots: [
              ...detail.slots.filter((item) => item.id !== slot.id),
              slot,
            ],
            courses: course
              ? [
                  ...detail.courses.filter((item) => item.id !== course.id),
                  course,
                ]
              : detail.courses,
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "curricula",
          ),
        }),
      ]);
    },
  });
}

type SlotChange = { term: CurriculumTerm; original: CurriculumSlot } & (
  { action: "edit"; values: CurriculumSlotValues } | { action: "delete" }
);

function slotSnapshotMatches(
  current: CurriculumSlot,
  original: CurriculumSlot,
) {
  return (
    current.id === original.id &&
    current.curriculum_term_id === original.curriculum_term_id &&
    (current.course_id ?? null) === (original.course_id ?? null) &&
    current.is_elective_slot === original.is_elective_slot &&
    (current.slot_type ??
      (current.is_elective_slot ? "elective" : "required")) ===
      (original.slot_type ??
        (original.is_elective_slot ? "elective" : "required")) &&
    (current.slot_label ?? null) === (original.slot_label ?? null) &&
    current.nominal_units === original.nominal_units
  );
}

export function useManageCurriculumSlot() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (change: SlotChange) => {
      if (scope.status !== "ready")
        throw new Error(
          "An authorized department is required to manage curriculum requirements.",
        );
      const { term, original } = change;
      const versionId = term.curriculum_version_id;
      const catalogKey = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curricula",
      );
      const catalog =
        queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(
          catalogKey,
        );
      const version = catalog?.versions.find((item) => item.id === versionId);
      if (
        !version ||
        !catalog?.programs.some(
          (program) =>
            program.id === version.program_id &&
            program.department_id === scope.departmentId,
        )
      ) {
        throw new Error(
          "This version is no longer available in your authorized department. Refresh the list.",
        );
      }
      const detailKey = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curriculum-overview",
        { versionId },
      );
      const detail =
        queryClient.getQueryData<Awaited<ReturnType<typeof readCurriculum>>>(
          detailKey,
        );
      const currentTerm = detail?.terms.find(
        (item) =>
          item.id === term.id && item.curriculum_version_id === versionId,
      );
      if (
        !currentTerm ||
        currentTerm.year_level !== term.year_level ||
        currentTerm.term_sequence !== term.term_sequence
      ) {
        throw new Error(
          "This term changed while the dialog was open. Close it and review the refreshed term.",
        );
      }
      const current = detail?.slots.find(
        (item) =>
          item.id === original.id && item.curriculum_term_id === term.id,
      );
      if (!current || !slotSnapshotMatches(current, original)) {
        throw new Error(
          "This requirement changed while the dialog was open. Close it and review the refreshed requirement.",
        );
      }
      if (change.action === "delete") {
        await deleteCurriculumSlot(current.id);
        return {
          action: change.action,
          id: current.id,
          versionId,
          profileId: scope.profileId,
          departmentId: scope.departmentId,
        };
      }
      const parsed = curriculumSlotSchema.parse(change.values);
      const fixedCourse =
        parsed.slot_type === "required" ||
        parsed.slot_type === "pe" ||
        parsed.slot_type === "nstp";
      const coursesKey = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curriculum-course-options",
      );
      const courses = queryClient.getQueryData<Course[]>(coursesKey) ?? [];
      const course = fixedCourse
        ? courses.find(
            (item) =>
              item.id === parsed.course_id &&
              item.department_id === scope.departmentId &&
              item.status === "active",
          )
        : undefined;
      const retainingOriginalCourse =
        fixedCourse && current.course_id === parsed.course_id;
      if (
        fixedCourse &&
        parsed.course_id &&
        !course &&
        !retainingOriginalCourse
      )
        throw new Error(
          "Select an active course from your department catalog and retry.",
        );
      const request = curriculumSlotUpdateRequest(parsed);
      const response = await updateCurriculumSlot(current.id, request);
      if (
        !response?.id ||
        response.id !== current.id ||
        response.curriculum_term_id !== current.curriculum_term_id ||
        response.is_elective_slot !== request.is_elective_slot ||
        response.nominal_units !== request.nominal_units ||
        (response.course_id !== undefined &&
          response.course_id !== request.course_id) ||
        (response.slot_type !== undefined &&
          response.slot_type !== request.slot_type) ||
        (response.slot_label !== undefined &&
          response.slot_label !== request.slot_label)
      ) {
        throw new Error(
          "The requirement update result could not be confirmed. Refresh the curriculum before submitting again.",
        );
      }
      const updated: CurriculumSlot = {
        ...current,
        ...response,
        ...request,
        id: current.id,
        curriculum_term_id: current.curriculum_term_id,
      };
      return {
        action: change.action,
        id: current.id,
        updated,
        course,
        versionId,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({
      action,
      id,
      updated,
      course,
      versionId,
      profileId,
      departmentId,
    }) => {
      const detailKey = staffQueryKeys.resource(
        profileId,
        departmentId,
        "curriculum-overview",
        { versionId },
      );
      await queryClient.cancelQueries({ queryKey: detailKey });
      queryClient.setQueryData<Awaited<ReturnType<typeof readCurriculum>>>(
        detailKey,
        (detail) => {
          if (!detail) return detail;
          return {
            ...detail,
            slots:
              action === "delete"
                ? detail.slots.filter((item) => item.id !== id)
                : detail.slots.map((item) =>
                    item.id === id ? updated! : item,
                  ),
            courses:
              action === "edit" && course
                ? [
                    ...detail.courses.filter((item) => item.id !== course.id),
                    course,
                  ]
                : detail.courses,
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "curricula",
          ),
        }),
      ]);
    },
  });
}

export type VersionLifecycleAction = "retire" | "delete";

export function useCurriculumVersionLifecycle() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({
      action,
      original,
    }: {
      action: VersionLifecycleAction;
      original: CurriculumVersion;
    }) => {
      if (scope.status !== "ready")
        throw new Error(
          "An authorized department is required to manage a version.",
        );
      const key = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curricula",
      );
      const catalog =
        queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(
          key,
        );
      const current = catalog?.versions.find(
        (version) => version.id === original.id,
      );
      if (
        !current ||
        !catalog?.programs.some(
          (program) =>
            program.id === current.program_id &&
            program.department_id === scope.departmentId,
        )
      ) {
        throw new Error(
          "This version is no longer available in your authorized department. Refresh the list.",
        );
      }
      if (
        current.program_id !== original.program_id ||
        current.version_label !== original.version_label ||
        current.status !== original.status
      ) {
        throw new Error(
          "This version changed while the confirmation was open. Close it and review the refreshed version.",
        );
      }
      let retired: CurriculumVersion | undefined;
      if (action === "retire") {
        if (current.status === "retired" || current.status === "closed")
          throw new Error("This version is already retired or closed.");
        retired = await updateCurriculumVersion(original.id, {
          status: "retired",
        });
        if (
          retired?.id !== original.id ||
          retired.program_id !== original.program_id ||
          retired.status !== "retired"
        ) {
          throw new Error(
            "The retirement result could not be confirmed. Refresh the version list before continuing.",
          );
        }
      } else {
        // Counts are informational. Only the server can establish that no history,
        // transfer, equivalence or last-version dependency prevents deletion.
        await deleteCurriculumVersion(original.id);
      }
      return {
        action,
        id: original.id,
        retired,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ action, id, retired, profileId, departmentId }) => {
      const key = staffQueryKeys.resource(profileId, departmentId, "curricula");
      await queryClient.cancelQueries({ queryKey: key });
      const detailKey = staffQueryKeys.resource(
        profileId,
        departmentId,
        "curriculum-overview",
        { versionId: id },
      );
      if (action === "delete") {
        await queryClient.cancelQueries({ queryKey: detailKey });
        queryClient.removeQueries({ queryKey: detailKey });
      }
      queryClient.setQueryData<Awaited<ReturnType<typeof listCurricula>>>(
        key,
        (catalog) => {
          if (!catalog) return catalog;
          return {
            ...catalog,
            versions:
              action === "delete"
                ? catalog.versions.filter((version) => version.id !== id)
                : catalog.versions.map((version) =>
                    version.id === id ? retired! : version,
                  ),
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "student-filter-options",
          ),
        }),
      ]);
    },
  });
}

export function useUpdateCurriculumVersion() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({
      original,
      values,
    }: {
      original: CurriculumVersion;
      values: CurriculumVersionValues;
    }) => {
      if (scope.status !== "ready")
        throw new Error(
          "An authorized department is required to edit a version.",
        );
      const key = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curricula",
      );
      const catalog =
        queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(
          key,
        );
      const current = catalog?.versions.find(
        (version) => version.id === original.id,
      );
      if (
        !current ||
        values.program_id !== current.program_id ||
        !catalog?.programs.some(
          (program) =>
            program.id === current.program_id &&
            program.department_id === scope.departmentId,
        )
      ) {
        throw new Error(
          "This version is no longer available in your authorized department. Refresh the list.",
        );
      }
      const fields = [
        "version_label",
        "effective_start",
        "effective_end",
        "total_units",
        "delinquency_threshold",
        "status",
      ] as const;
      if (
        current.program_id !== original.program_id ||
        fields.some((field) => current[field] !== original[field])
      ) {
        throw new Error(
          "This version changed while the form was open. Close the dialog and review the refreshed version before editing again.",
        );
      }
      const version = await updateCurriculumVersion(
        original.id,
        versionUpdateRequest(values),
      );
      if (
        !version ||
        version.id !== original.id ||
        version.program_id !== original.program_id
      ) {
        throw new Error(
          "The service returned an unexpected version. Refresh the list to confirm the update.",
        );
      }
      return {
        version,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ version, profileId, departmentId }) => {
      const key = staffQueryKeys.resource(profileId, departmentId, "curricula");
      queryClient.setQueryData<Awaited<ReturnType<typeof listCurricula>>>(
        key,
        (catalog) => {
          if (!catalog) return catalog;
          return {
            ...catalog,
            versions: catalog.versions.map((item) =>
              item.id === version.id ? version : item,
            ),
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "curriculum-overview",
            { versionId: version.id },
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "student-filter-options",
          ),
        }),
      ]);
    },
  });
}

export function useCreateCurriculumVersion() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (values: CurriculumVersionValues) => {
      if (scope.status !== "ready")
        throw new Error(
          "An authorized department is required to create a version.",
        );
      const key = staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "curricula",
      );
      const catalog =
        queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(
          key,
        );
      if (
        !catalog?.programs.some(
          (program) =>
            program.id === values.program_id &&
            program.department_id === scope.departmentId,
        )
      ) {
        throw new Error(
          "Select a program in your authorized department and retry.",
        );
      }
      const version = await createCurriculumVersion(
        blankVersionRequest(values),
      );
      if (!version?.id || version.program_id !== values.program_id) {
        throw new Error(
          "The service returned an unexpected version. Refresh the list before trying again; creation may have completed.",
        );
      }
      return {
        version,
        profileId: scope.profileId,
        departmentId: scope.departmentId,
      };
    },
    onSuccess: async ({ version, profileId, departmentId }) => {
      // Use the originating identity/scope even if the session changes in flight.
      const key = staffQueryKeys.resource(profileId, departmentId, "curricula");
      queryClient.setQueryData<Awaited<ReturnType<typeof listCurricula>>>(
        key,
        (catalog) => {
          if (!catalog) return catalog;
          return {
            ...catalog,
            versions: [
              version,
              ...catalog.versions.filter((item) => item.id !== version.id),
            ],
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "student-filter-options",
          ),
        }),
      ]);
    },
  });
}

export function useCurricula() {
  const scope = useStaffScope();
  const active = scope.status === "ready" ? scope : null;
  return useQuery({
    queryKey: staffQueryKeys.resource(
      active?.profileId ?? "",
      active?.departmentId ?? "",
      "curricula",
    ),
    enabled: active !== null,
    retry: false,
    queryFn: ({ signal }) => {
      if (!active)
        throw new Error(
          "Curriculum requests require an authorized department.",
        );
      return listCurricula(active.departmentId, signal);
    },
  });
}

export function useCurriculum(versionId: string | undefined) {
  const scope = useStaffScope();
  const active = scope.status === "ready" ? scope : null;
  return useQuery({
    queryKey: staffQueryKeys.resource(
      active?.profileId ?? "",
      active?.departmentId ?? "",
      "curriculum-overview",
      { versionId },
    ),
    enabled: active !== null && versionId !== undefined,
    retry: false,
    queryFn: ({ signal }) => {
      if (!active || !versionId)
        throw new Error("Select an authorized curriculum version first.");
      return readCurriculum(versionId, signal);
    },
  });
}

export function useCurriculumCourses(enabled = true) {
  const scope = useStaffScope();
  const active = scope.status === "ready" ? scope : null;
  return useQuery({
    queryKey: staffQueryKeys.resource(
      active?.profileId ?? "",
      active?.departmentId ?? "",
      "curriculum-course-options",
    ),
    enabled: active !== null && enabled,
    retry: false,
    queryFn: ({ signal }) => {
      if (!active)
        throw new Error("Course requests require an authorized department.");
      return listCurriculumCourses(active.departmentId, signal);
    },
  });
}
