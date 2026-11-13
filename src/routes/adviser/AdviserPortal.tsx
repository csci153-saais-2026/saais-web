import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { useAuth } from '@/hooks/use-auth'

export default function AdviserPortal() {
  const { user } = useAuth()

  return (
    <div className="max-w-5xl mx-auto p-8 grid gap-6">
      <PageHeading
        title="Academic Adviser Portal"
        subtitle={`Welcome, ${user?.fullName ?? 'Adviser'} (${user?.email ?? ''})`}
      />
      <Panel title="Advisee Roster & Workspace" description="Manage student advising, degree evaluations, and course recommendations.">
        <p className="text-sm text-muted-foreground">
          Advisee 360 view, enrollment attempt logging, note recording, and equivalency evaluations.
        </p>
      </Panel>
    </div>
  )
}

