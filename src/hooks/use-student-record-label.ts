import { useState } from 'react'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { apiClient, unwrapApiResult } from '@/lib/api'

const FALLBACK_LABEL = 'Student record'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Resolve only the selected record, using the signed-in account's existing API access. */
export function useStudentRecordLabel(userId: string | undefined, recordId: string | undefined) {
  // Keep the label cache scoped to this authenticated shell's lifetime.
  const [queryClient] = useState(() => new QueryClient())
  const { data } = useQuery({
    queryKey: ['student-record-label', userId, recordId],
    enabled: Boolean(userId && recordId),
    retry: false,
    queryFn: async ({ signal }) => {
      if (!recordId) return FALLBACK_LABEL
      const byId = UUID.test(recordId)
      const profiles = unwrapApiResult(await apiClient.GET('/rest/v1/profile', {
        params: { query: {
          ...(byId ? { id: `eq.${recordId}` } : { student_number: `eq.${recordId}` }),
          select: 'id,full_name,student_number',
          limit: 1,
        } },
        signal,
      }))
      const selected = profiles.find(profile => byId
        ? profile.id.toLowerCase() === recordId.toLowerCase()
        : profile.student_number === recordId)
      return selected?.full_name?.trim() || FALLBACK_LABEL
    },
  }, queryClient)

  return data ?? FALLBACK_LABEL
}
