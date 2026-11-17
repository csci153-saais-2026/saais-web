import { useScopedRequest } from './use-scoped-request'
import { getDeficiencySubjects } from './deficiency-subjects.api'

export function DeficiencySubjects({ studentId, userId, count }: { studentId: string; userId: string; count: number }) {
  const { data, error } = useScopedRequest(JSON.stringify([userId, studentId, count]), count > 0, () => getDeficiencySubjects(studentId))
  if (!count) return <span>—</span>
  if (error) return <span className="text-muted-foreground">Subjects unavailable</span>
  if (!data) return <span role="status">Loading…</span>
  return <span>{data.length ? data.join(', ') : 'Details unavailable'}</span>
}
