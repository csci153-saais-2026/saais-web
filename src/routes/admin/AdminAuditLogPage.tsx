import { AdminPageScaffold } from './AdminPageScaffold'

export default function AdminAuditLogPage() {
  return (
    <AdminPageScaffold
      title="Audit log"
      subtitle="Review institution-wide system activity."
      panelTitle="Audit history"
      description="Search immutable, filtered, and bounded audit history."
    />
  )
}
