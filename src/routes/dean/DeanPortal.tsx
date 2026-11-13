import { Panel } from '@/components/features/panel'

export default function DeanPortal() {
  return (
    <div className="space-y-6">
      <Panel
        title="College Dean Portal"
        description="Faculty-wide cohort analytics, cross-department curriculum transfers, and college audit reports."
      >
        <div className="p-6 text-sm text-muted-foreground border rounded-md bg-muted/20">
          <p className="font-semibold text-foreground">Office of the Dean (Tracked Feature)</p>
          <p className="mt-1">
            This module provides college-level oversight and reporting across all constituent departments. You are authenticated as an authorized Dean.
          </p>
        </div>
      </Panel>
    </div>
  )
}

