import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { StudentRecordHeader } from '@/components/features/student-record-header'
import { Button } from '@/components/ui/button'
import { getSelectedStudent } from './advisees.api'
import { useScopedRequest } from './use-scoped-request'

export function SelectedStudentHeader({ id }: { id: string }) {
  const { user } = useAuth()
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([user?.id, id, revision])
  const { data, error } = useScopedRequest(key, !!user?.id, () => getSelectedStudent(id))
  if (error) return <div role="alert" className="mb-5"><p>{error}</p><Button variant="outline" onClick={() => setRevision(n => n + 1)}>Try again</Button></div>
  if (!data) return <p role="status" className="mb-5">Loading student record…</p>
  return <StudentRecordHeader name={data.full_name} initials={data.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()} studentNumber={data.student_number} program={data.program_name} yearLabel={`Year ${data.year_level}`} email={data.email} standing={data.is_delinquent ? 'delinquent' : data.standing === 'good_standing' ? 'good' : 'flagged'} standingLabel={data.is_delinquent ? 'Delinquency flag' : data.standing.replaceAll('_', ' ')} />
}

