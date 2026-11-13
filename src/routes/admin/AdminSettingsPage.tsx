import { AdminPageScaffold } from './AdminPageScaffold'

export default function AdminSettingsPage() {
  return (
    <AdminPageScaffold
      title="System settings"
      subtitle="Configure institution-wide academic standing and system metadata."
      panelTitle="Settings"
      description="Review academic thresholds, sender email, and backup metadata."
    />
  )
}
