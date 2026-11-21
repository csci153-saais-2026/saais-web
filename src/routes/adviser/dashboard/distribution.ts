import type { ApiSchema } from '@/lib/api'
import type { GradeBand } from '@/components/features/grade-distribution'

export function distributionBands(distribution: ApiSchema<'GradeDistributionBreakdown'>): GradeBand[] {
  const statuses = distribution.inc_count + distribution.dr_count + distribution.na_count
  const total = distribution.total_graded + statuses
  const percent = (count: number) => total ? Number((count * 100 / total).toFixed(1)) : 0
  return [
    ...distribution.buckets.map(bucket => {
      const failing = bucket.label === '5.00' || (bucket.min_grade != null && bucket.min_grade > 3 && bucket.max_grade === 5) || /^3\.25\s*[–-]\s*5\.00$/.test(bucket.label)
      return { label: failing ? '5.00' : bucket.label, percent: percent(bucket.count), tone: failing ? 'fail' as const : 'primary' as const }
    }),
    { label: 'INC / DR / NA', percent: percent(statuses), tone: 'inc' },
  ]
}
