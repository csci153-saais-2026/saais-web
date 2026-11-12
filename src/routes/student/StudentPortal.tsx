import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { useAuth } from '@/hooks/use-auth'

export default function StudentPortal() {
  const { user } = useAuth()

  return (
    <div className="max-w-5xl mx-auto p-8 grid gap-6">
      <PageHeading
        title="Student Portal"
        subtitle={`Welcome, ${user?.fullName ?? 'Student'} (${user?.email ?? ''})`}
      />
      <Panel title="Academic Progress & Checklist" description="Interactive curriculum audit and tracking.">
        <p className="text-sm text-muted-foreground">
          View your degree requirements, prerequisite status, enrolled courses, and grades.
        </p>
      </Panel>
    </div>
  )
}

