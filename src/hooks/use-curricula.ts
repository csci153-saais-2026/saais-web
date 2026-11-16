import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { createCurriculumTerm, createCurriculumVersion, deleteCurriculumVersion, listCurricula, readCurriculum, updateCurriculumVersion, type CurriculumVersion } from '@/routes/department-staff/curricula/curricula.api'
import { blankVersionRequest, versionUpdateRequest, type CurriculumVersionValues } from '@/routes/department-staff/curricula/curriculum-version.schema'
import { curriculumTermSchema, type CurriculumTermValues } from '@/routes/department-staff/curricula/curriculum-term.schema'

export function useCreateCurriculumTerm() {
  const scope = useStaffScope()
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({ versionId, values }: { versionId: string; values: CurriculumTermValues }) => {
      if (scope.status !== 'ready') throw new Error('An authorized department is required to add a curriculum term.')
      const key = staffQueryKeys.resource(scope.profileId, scope.departmentId, 'curricula')
      const catalog = queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(key)
      const version = catalog?.versions.find(item => item.id === versionId)
      if (!version || !catalog?.programs.some(program => program.id === version.program_id && program.department_id === scope.departmentId)) {
        throw new Error('This version is no longer available in your authorized department. Refresh the list.')
      }
      const detailKey = staffQueryKeys.resource(scope.profileId, scope.departmentId, 'curriculum-overview', { versionId })
      const detail = queryClient.getQueryData<Awaited<ReturnType<typeof readCurriculum>>>(detailKey)
      if (!detail) throw new Error('Load the selected curriculum requirements before adding a term.')
      const position = curriculumTermSchema.parse(values)
      if (detail.terms.some(term => term.year_level === position.year_level && term.term_sequence === position.term_sequence)) {
        throw new Error('This year and term position already exists in the selected curriculum.')
      }
      // Empty terms are approved for Step 22. No requirement-slot writes are made.
      const term = await createCurriculumTerm({ curriculum_version_id: versionId, ...position, slots: [] })
      if (!term?.id || term.curriculum_version_id !== versionId || term.year_level !== position.year_level || term.term_sequence !== position.term_sequence) {
        throw new Error('The term creation result could not be confirmed. Refresh the curriculum before submitting again.')
      }
      return { term, versionId, profileId: scope.profileId, departmentId: scope.departmentId }
    },
    onSuccess: async ({ term, versionId, profileId, departmentId }) => {
      const detailKey = staffQueryKeys.resource(profileId, departmentId, 'curriculum-overview', { versionId })
      queryClient.setQueryData<Awaited<ReturnType<typeof readCurriculum>>>(detailKey, detail => {
        if (!detail) return detail
        return { ...detail, terms: [...detail.terms.filter(item => item.id !== term.id), term].sort((a, b) => a.year_level - b.year_level || a.term_sequence - b.term_sequence || a.id.localeCompare(b.id)) }
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({ queryKey: staffQueryKeys.resource(profileId, departmentId, 'curricula') }),
      ])
    },
  })
}

export type VersionLifecycleAction = 'retire' | 'delete'

export function useCurriculumVersionLifecycle() {
  const scope = useStaffScope()
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({ action, original }: { action: VersionLifecycleAction; original: CurriculumVersion }) => {
      if (scope.status !== 'ready') throw new Error('An authorized department is required to manage a version.')
      const key = staffQueryKeys.resource(scope.profileId, scope.departmentId, 'curricula')
      const catalog = queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(key)
      const current = catalog?.versions.find(version => version.id === original.id)
      if (!current || !catalog?.programs.some(program => program.id === current.program_id && program.department_id === scope.departmentId)) {
        throw new Error('This version is no longer available in your authorized department. Refresh the list.')
      }
      if (current.program_id !== original.program_id || current.version_label !== original.version_label || current.status !== original.status) {
        throw new Error('This version changed while the confirmation was open. Close it and review the refreshed version.')
      }
      let retired: CurriculumVersion | undefined
      if (action === 'retire') {
        if (current.status === 'retired' || current.status === 'closed') throw new Error('This version is already retired or closed.')
        retired = await updateCurriculumVersion(original.id, { status: 'retired' })
        if (retired?.id !== original.id || retired.program_id !== original.program_id || retired.status !== 'retired') {
          throw new Error('The retirement result could not be confirmed. Refresh the version list before continuing.')
        }
      } else {
        // Counts are informational. Only the server can establish that no history,
        // transfer, equivalence or last-version dependency prevents deletion.
        await deleteCurriculumVersion(original.id)
      }
      return { action, id: original.id, retired, profileId: scope.profileId, departmentId: scope.departmentId }
    },
    onSuccess: async ({ action, id, retired, profileId, departmentId }) => {
      const key = staffQueryKeys.resource(profileId, departmentId, 'curricula')
      const detailKey = staffQueryKeys.resource(profileId, departmentId, 'curriculum-overview', { versionId: id })
      if (action === 'delete') {
        await queryClient.cancelQueries({ queryKey: detailKey })
        queryClient.removeQueries({ queryKey: detailKey })
      }
      queryClient.setQueryData<Awaited<ReturnType<typeof listCurricula>>>(key, catalog => {
        if (!catalog) return catalog
        return { ...catalog, versions: action === 'delete'
          ? catalog.versions.filter(version => version.id !== id)
          : catalog.versions.map(version => version.id === id ? retired! : version) }
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: staffQueryKeys.resource(profileId, departmentId, 'student-filter-options') }),
      ])
    },
  })
}

export function useUpdateCurriculumVersion() {
  const scope = useStaffScope()
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({ original, values }: { original: CurriculumVersion; values: CurriculumVersionValues }) => {
      if (scope.status !== 'ready') throw new Error('An authorized department is required to edit a version.')
      const key = staffQueryKeys.resource(scope.profileId, scope.departmentId, 'curricula')
      const catalog = queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(key)
      const current = catalog?.versions.find(version => version.id === original.id)
      if (!current || values.program_id !== current.program_id || !catalog?.programs.some(program => program.id === current.program_id && program.department_id === scope.departmentId)) {
        throw new Error('This version is no longer available in your authorized department. Refresh the list.')
      }
      const fields = ['version_label', 'effective_start', 'effective_end', 'total_units', 'delinquency_threshold', 'status'] as const
      if (current.program_id !== original.program_id || fields.some(field => current[field] !== original[field])) {
        throw new Error('This version changed while the form was open. Close the dialog and review the refreshed version before editing again.')
      }
      const version = await updateCurriculumVersion(original.id, versionUpdateRequest(values))
      if (!version || version.id !== original.id || version.program_id !== original.program_id) {
        throw new Error('The service returned an unexpected version. Refresh the list to confirm the update.')
      }
      return { version, profileId: scope.profileId, departmentId: scope.departmentId }
    },
    onSuccess: async ({ version, profileId, departmentId }) => {
      const key = staffQueryKeys.resource(profileId, departmentId, 'curricula')
      queryClient.setQueryData<Awaited<ReturnType<typeof listCurricula>>>(key, catalog => {
        if (!catalog) return catalog
        return { ...catalog, versions: catalog.versions.map(item => item.id === version.id ? version : item) }
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: staffQueryKeys.resource(profileId, departmentId, 'curriculum-overview', { versionId: version.id }) }),
        queryClient.invalidateQueries({ queryKey: staffQueryKeys.resource(profileId, departmentId, 'student-filter-options') }),
      ])
    },
  })
}

export function useCreateCurriculumVersion() {
  const scope = useStaffScope()
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (values: CurriculumVersionValues) => {
      if (scope.status !== 'ready') throw new Error('An authorized department is required to create a version.')
      const key = staffQueryKeys.resource(scope.profileId, scope.departmentId, 'curricula')
      const catalog = queryClient.getQueryData<Awaited<ReturnType<typeof listCurricula>>>(key)
      if (!catalog?.programs.some(program => program.id === values.program_id && program.department_id === scope.departmentId)) {
        throw new Error('Select a program in your authorized department and retry.')
      }
      const version = await createCurriculumVersion(blankVersionRequest(values))
      if (!version?.id || version.program_id !== values.program_id) {
        throw new Error('The service returned an unexpected version. Refresh the list before trying again; creation may have completed.')
      }
      return { version, profileId: scope.profileId, departmentId: scope.departmentId }
    },
    onSuccess: async ({ version, profileId, departmentId }) => {
      // Use the originating identity/scope even if the session changes in flight.
      const key = staffQueryKeys.resource(profileId, departmentId, 'curricula')
      queryClient.setQueryData<Awaited<ReturnType<typeof listCurricula>>>(key, catalog => {
        if (!catalog) return catalog
        return { ...catalog, versions: [version, ...catalog.versions.filter(item => item.id !== version.id)] }
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: staffQueryKeys.resource(profileId, departmentId, 'student-filter-options') }),
      ])
    },
  })
}

export function useCurricula() {
  const scope = useStaffScope()
  const active = scope.status === 'ready' ? scope : null
  return useQuery({
    queryKey: staffQueryKeys.resource(active?.profileId ?? '', active?.departmentId ?? '', 'curricula'),
    enabled: active !== null,
    retry: false,
    queryFn: ({ signal }) => {
      if (!active) throw new Error('Curriculum requests require an authorized department.')
      return listCurricula(active.departmentId, signal)
    },
  })
}

export function useCurriculum(versionId: string | undefined) {
  const scope = useStaffScope()
  const active = scope.status === 'ready' ? scope : null
  return useQuery({
    queryKey: staffQueryKeys.resource(active?.profileId ?? '', active?.departmentId ?? '', 'curriculum-overview', { versionId }),
    enabled: active !== null && versionId !== undefined,
    retry: false,
    queryFn: ({ signal }) => {
      if (!active || !versionId) throw new Error('Select an authorized curriculum version first.')
      return readCurriculum(versionId, signal)
    },
  })
}
