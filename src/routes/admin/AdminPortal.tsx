import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { useAuth } from '@/hooks/use-auth'

export default function AdminPortal() {
  const { user } = useAuth()

  return (
    <div className="max-w-5xl mx-auto p-8 grid gap-6">
      <PageHeading
        title="System Administration Portal"
        subtitle={`Welcome, ${user?.fullName ?? 'Administrator'} (${user?.email ?? ''})`}
      />
      <Panel title="System Operations" description="Manage user accounts, programs, curricula, and courses.">
        <p className="text-sm text-muted-foreground">
          User provisioning, role assignments, prerequisite rule management, and audit logs.
        </p>
      </Panel>
    </div>
  )
}

