import { Panel } from '@/components/features/panel'

export default function DepartmentHeadPortal() {
  return (
    <div className="space-y-6">
      <Panel
        title="Department Head Workspace"
        description="Curriculum transfers, equivalences, course offerings, and department analytics."
      >
        <div className="p-6 text-sm text-muted-foreground border rounded-md bg-muted/20">
          <p className="font-semibold text-foreground">Department Head Portal (Feature Issue #63)</p>
          <p className="mt-1">
            This module is being integrated from <code>feat/department-head-ui</code>. You are authenticated as an authorized Department Head.
          </p>
        </div>
      </Panel>
    </div>
  )
}

