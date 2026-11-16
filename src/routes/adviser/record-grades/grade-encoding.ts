export function outcomeRemark(final: string): string {
  if (final === 'inc') return 'INC'
  if (final === 'dr') return 'DR'
  if (final && Number(final) <= 3) return 'Passed'
  if (final === '5.00') return 'Failed'
  return ''
}
