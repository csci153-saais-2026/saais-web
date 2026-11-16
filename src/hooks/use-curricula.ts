import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { createCurriculumVersion, deleteCurriculumVersion, listCurricula, readCurriculum, updateCurriculumVersion, type CurriculumVersion } from '@/routes/department-staff/curricula/curricula.api'
import { blankVersionRequest, versionUpdateRequest, type CurriculumVersionValues } from '@/routes/department-staff/curricula/curriculum-version.schema'

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
