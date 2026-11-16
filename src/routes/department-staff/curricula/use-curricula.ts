import { useQuery } from '@tanstack/react-query'
import { staffQueryKeys } from '../shared/staff-query-keys'
import { useStaffScope } from '../shared/use-staff-scope'
import { listCurricula, readCurriculum } from './curricula.api'

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
