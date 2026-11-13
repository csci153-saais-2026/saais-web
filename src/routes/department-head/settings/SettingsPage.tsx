import { PageHeading } from "@/components/features/page-heading"
import { BackupRecordPanel } from "./BackupRecordPanel"
import { EmailSettingsForm } from "./EmailSettingsForm"
import { StandingRulesForm } from "./StandingRulesForm"

export default function SettingsPage() {
  return (
    <>
      <PageHeading title="Settings" subtitle="Configure department standing rules, email, and backup records." />
      <StandingRulesForm />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <EmailSettingsForm />
        <BackupRecordPanel />
      </div>
    </>
  )
}
