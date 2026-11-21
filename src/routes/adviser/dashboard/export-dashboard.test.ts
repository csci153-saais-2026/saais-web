import { expect, it, vi } from 'vitest'
import type { ApiSchema } from '@/lib/api'
import { createDashboardPdf } from './export-dashboard'

it('creates a PDF for the selected report', async () => {
  const report = { adviser_id: 'adviser-one', total_advisees: 2, mean_gwa: 1.75, computed_at: '2026-11-10T00:00:00Z', grade_distribution: { total_graded: 1, inc_count: 1, dr_count: 0, na_count: 0, currently_enrolled_count: 0, buckets: [{ label: '1.00-1.50', percentage: 100, count: 1 }] }, batch_curriculum_gwa: [{ entry_year: 2023, program_code: 'BSCS', curriculum_label: '2023', student_count: 2, mean_gwa: 1.75 }] } as ApiSchema<'AdviserDashboardReport'>
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Asset unavailable')))
  try {
    const department = { id: 'department-one', name: 'Computing Department', letterhead_prefix: 'Department of', letterhead_name: 'COMPUTING', department_head_name: 'Head One' } as ApiSchema<'Department'>
    const blob = await createDashboardPdf(report, 'All terms', 1, 'Adviser One', department)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(1000)
    const contents = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob) })
    expect(contents).toContain('COMPUTING')
    expect(contents).toContain('Head One')
    expect(contents).toContain('Adviser One')
    expect(contents).toContain('INC / DR / NA')
    expect(contents).toContain('50%')
  } finally { vi.unstubAllGlobals() }
})
