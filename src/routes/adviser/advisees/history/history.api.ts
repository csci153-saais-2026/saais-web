import { apiClient, postgrestFilter, unwrapApiResult } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'
import { getSelectedStudent } from '../advisees.api'

export async function getStudentHistory(studentId: string) {
  await getSelectedStudent(studentId)
  const items: ApiSchema<'AuditLogEntry'>[] = []
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(await apiClient.GET('/rest/v1/audit_log_entry', { params: { query: { student_id: postgrestFilter.eq(studentId), select: 'id,actor_id,actor_name,actor_role,student_id,action,action_category,details_summary,created_at', order: 'created_at.desc,id.desc', limit: 100, offset } } }))
    if (page.some(row => row.student_id !== studentId || items.some(old => old.id === row.id))) throw new Error('The audit response did not match the selected student.')
    items.push(...page)
    if (page.length < 100) return items
  }
}
