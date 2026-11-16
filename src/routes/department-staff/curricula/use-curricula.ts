import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { staffQueryKeys } from '../shared/staff-query-keys'
import { useStaffScope } from '../shared/use-staff-scope'
import { createCurriculumVersion, listCurricula, readCurriculum, updateCurriculumVersion, type CurriculumVersion } from './curricula.api'
import { blankVersionRequest, versionUpdateRequest, type CurriculumVersionValues } from './curriculum-version.schema'

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
