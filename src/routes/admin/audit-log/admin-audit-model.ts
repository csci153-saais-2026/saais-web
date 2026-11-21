import { postgrestFilter, type ApiSchema, type OperationQuery } from '@/lib/api'

export const AUDIT_PAGE_SIZE = 25
export const MAX_AUDIT_OFFSET = 1_000_000

export const AUDIT_LOG_SELECT =
  'id,actor_name,actor_role,student_name,student_number,target_label,action,action_category,entity_type,details_summary,created_at'

export type AuditActionCategory = NonNullable<
  ApiSchema<'AuditLogEntry'>['action_category']
>
export type AuditLogRow = Pick<
  ApiSchema<'AuditLogEntry'>,
  | 'id'
  | 'actor_name'
  | 'actor_role'
  | 'student_name'
  | 'student_number'
  | 'target_label'
  | 'action'
  | 'action_category'
  | 'entity_type'
  | 'details_summary'
  | 'created_at'
>
export type AuditListQuery = OperationQuery<'listAuditLogEntries'>

export const AUDIT_ACTION_CATEGORIES: readonly {
  value: AuditActionCategory
  label: string
}[] = [
  { value: 'view', label: 'View' },
  { value: 'change', label: 'Change' },
  { value: 'sign_in', label: 'Sign-in' },
  { value: 'record_view', label: 'Record view' },
  { value: 'grade_update', label: 'Grade update' },
  { value: 'plan_save', label: 'Plan save' },
  { value: 'note_change', label: 'Note change' },
  { value: 'override', label: 'Override' },
  { value: 'export', label: 'Export' },
  { value: 'auth_account', label: 'Account and access' },
  { value: 'catalog_term', label: 'Catalog and term' },
]

export interface AuditFilters {
  readonly person: string
  readonly student: string
  readonly action: string
  readonly category: string
  readonly entityType: string
  readonly from: string
  readonly to: string
}

export function buildAuditListQuery(
  filters: AuditFilters,
  offset: number,
): { query: AuditListQuery | null; error: string | null } {
  const query: AuditListQuery = {
    select: AUDIT_LOG_SELECT,
    order: 'created_at.desc,id.desc',
    limit: AUDIT_PAGE_SIZE,
    offset: Math.min(
      MAX_AUDIT_OFFSET,
      Math.max(0, Number.isSafeInteger(offset) ? offset : 0),
    ),
  }

  const person = filters.person.trim()
  const student = filters.student.trim()
  const action = filters.action.trim()
  const entityType = filters.entityType.trim()

  for (const [label, value] of [
    ['Person', person],
    ['Student', student],
    ['Action', action],
    ['Entity type', entityType],
  ] as const) {
    if (value.length > 100) {
      return { query: null, error: `${label} search must be 100 characters or fewer.` }
    }
    if (
      [...value].some((character) => character.charCodeAt(0) <= 0x1f) ||
      /[(),."\\]/.test(value)
    ) {
      return { query: null, error: `${label} search contains unsupported characters.` }
    }
  }

  if (person) query.actor_name = postgrestFilter.ilike(`%${person}%`)
  if (student) {
    query.or = `(student_name.ilike.%${student}%,student_number.ilike.%${student}%,target_label.ilike.%${student}%)`
  }
  if (action) query.action = postgrestFilter.ilike(`%${action}%`)
  if (filters.category) {
    if (
      !AUDIT_ACTION_CATEGORIES.some(
        (category) => category.value === filters.category,
      )
    ) {
      return { query: null, error: 'Select a valid action category.' }
    }
    query.action_category = postgrestFilter.eq(filters.category)
  }
  if (entityType) query.entity_type = postgrestFilter.eq(entityType)

  if (Boolean(filters.from) !== Boolean(filters.to)) {
    return {
      query: null,
      error: 'Choose both a start date and an end date.',
    }
  }
  if (filters.from && filters.to) {
    const from = toUtcDateBoundary(filters.from, false)
    const to = toUtcDateBoundary(filters.to, true)
    const toExclusive = nextUtcDay(filters.to)
    if (!from || !to || !toExclusive) {
      return { query: null, error: 'Enter valid start and end dates.' }
    }
    if (from > to) {
      return { query: null, error: 'The start date must not be after the end date.' }
    }
    // Validates ordering; the upper bound is exclusive so sub-millisecond
    // timestamps late on the selected day are still included.
    postgrestFilter.createdAtBetween(from, to)
    query.and = `(created_at.gte.${from},created_at.lt.${toExclusive})`
  }

  return { query, error: null }
}

function nextUtcDay(value: string): string | null {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime())) return null
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

function toUtcDateBoundary(value: string, endOfDay: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null
  }
  return endOfDay
    ? `${value}T23:59:59.999Z`
    : `${value}T00:00:00.000Z`
}
