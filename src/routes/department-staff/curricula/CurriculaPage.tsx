import { useState } from 'react'
import { PageHeading } from '@/components/features/page-heading'
import { FormField } from '@/components/features/form-field'
import { Panel } from '@/components/features/panel'
import { StatGrid } from '@/components/features/stat-tile'
import { Button } from '@/components/ui/button'
import { ApiClientError } from '@/lib/api'
import { CurriculumTermPanel } from './CurriculumTermPanel'
import { useCurricula, useCurriculum } from './use-curricula'
import { CurriculumVersionDialog } from './CurriculumVersionDialog'
import type { CurriculumVersion } from './curricula.api'

function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Your account is not permitted to view this curriculum.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isNetworkError) return 'Could not reach the curriculum service. Check your connection and retry.'
  }
  return error instanceof Error ? error.message : 'The curriculum could not be loaded.'
}

export default function CurriculaPage() {
  const catalog = useCurricula()
  const [selection, setSelection] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [editing, setEditing] = useState<CurriculumVersion | null>(null)
  const [updated, setUpdated] = useState(false)
  const versions = catalog.isError ? [] : catalog.data?.versions ?? []
  const version = versions.find(item => item.id === selection) ?? versions[0]
  const detail = useCurriculum(version?.id)
  const statuses = { draft: 'Draft', active: 'Active', retired: 'Retired', teach_out: 'Teach out', closed: 'Closed' }
  return <div className="space-y-6">
    <PageHeading title="Curricula" subtitle="Shape the path to graduation." actions={<Button type="button" disabled={!catalog.isSuccess || !catalog.data.programs.length} onClick={() => { setCreated(false); setUpdated(false); setCreating(true) }}>Add version</Button>} />
    {created && <p role="status">Curriculum version created.</p>}
    {updated && <p role="status">Curriculum version updated.</p>}
    {editing && catalog.data && <CurriculumVersionDialog key={editing.id} version={editing} programs={catalog.data.programs} onClose={() => setEditing(null)} onUpdated={id => { setSelection(id); setEditing(null); setUpdated(true) }} />}
    {creating && catalog.data && <CurriculumVersionDialog programs={catalog.data.programs} onClose={() => setCreating(false)} onCreated={id => { setSelection(id); setCreating(false); setCreated(true) }} />}
    {catalog.isPending && <p role="status">Loading curriculum versions...</p>}
    {catalog.isError && <Panel title="Curriculum versions"><p role="alert">{errorMessage(catalog.error)}</p><Button type="button" variant="outline" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>Retry versions</Button></Panel>}
    {catalog.isSuccess && versions.length === 0 && <Panel title="Curriculum versions"><p>No curriculum versions are available for your department.</p></Panel>}
    {version && <>
      <FormField label="Curriculum version" htmlFor="curriculum-version">
        <select id="curriculum-version" className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm md:max-w-xl" value={version.id} onChange={event => setSelection(event.target.value)}>
          {versions.map(item => <option key={item.id} value={item.id}>{catalog.data?.programs.find(program => program.id === item.program_id)?.code ?? 'Program unavailable'} - {item.version_label}</option>)}
        </select>
      </FormField>
      <Button type="button" variant="outline" disabled={!catalog.isSuccess || catalog.isFetching} onClick={() => { setCreated(false); setUpdated(false); setEditing(version) }}>Edit version</Button>
      <StatGrid items={[
        { label: 'Required units', value: version.total_units ?? 'Unavailable' },
        { label: 'Delinquency threshold', value: version.delinquency_threshold ?? 'Unavailable', note: 'Failed units' },
        { label: 'Effective date', value: <span className="text-xl">{version.effective_start}</span>, note: version.effective_end ? `Ends ${version.effective_end}` : 'No end date specified' },
        { label: 'Status', value: statuses[version.status], note: version.enrolled_student_count === undefined ? 'Assigned student count unavailable' : `${version.enrolled_student_count} assigned students` },
      ]} />
      {detail.isPending && <p role="status">Loading curriculum requirements...</p>}
      {detail.isError && <Panel title="Curriculum requirements"><p role="alert">{errorMessage(detail.error)}</p><Button type="button" variant="outline" disabled={detail.isFetching} onClick={() => void detail.refetch()}>Retry requirements</Button></Panel>}
      {detail.isSuccess && <>
        {detail.data.terms.length === 0 && <Panel title="Curriculum requirements"><p>No terms are available for this curriculum version.</p></Panel>}
        {detail.data.terms.map(term => <CurriculumTermPanel key={term.id} term={term} slots={detail.data.slots.filter(slot => slot.curriculum_term_id === term.id)} courses={detail.data.courses} />)}
      </>}
    </>}
  </div>
}
