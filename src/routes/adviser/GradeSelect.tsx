import type { ComponentProps } from 'react'

const grades = Array.from({ length: 17 }, (_, index) => (1 + index * 0.25).toFixed(2))

export function GradeSelect({ includeStatuses = false, allowDrop = false, disableDrop = false, vsuScale = false, placeholder = 'Select grade', className = '', ...props }: ComponentProps<'select'> & { includeStatuses?: boolean; allowDrop?: boolean; disableDrop?: boolean; vsuScale?: boolean; placeholder?: string }) {
  return <select {...props} className={`w-full rounded-md border border-border bg-card px-3 py-2 ${className}`}>
    <option value="">{placeholder}</option>
    {grades.filter(grade => !vsuScale || Number(grade) <= 3 || grade === '5.00').map(grade => <option key={grade} value={grade}>{grade}</option>)}
    {includeStatuses && <option value="inc">INC</option>}
    {(includeStatuses || allowDrop) && <option value="dr" disabled={disableDrop}>DR</option>}
  </select>
}
