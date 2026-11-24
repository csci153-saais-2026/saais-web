import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { SETTINGS_SKELETON_SAMPLE } from "../shared/dh.skeleton-samples";
import { Fragment } from "react";
import { PageHeading } from "@/components/features/page-heading";
import { useDepartmentSettings } from "../shared/dh-queries";
import { QueryMessage } from "../shared/dh-ui";
import { BackupBanner, BackupRecordPanel } from "./BackupRecordPanel";
import { EmailSettingsForm } from "./EmailSettingsForm";
import { StandingRulesForm } from "./StandingRulesForm";

export default function SettingsPage() {
  const query = useDepartmentSettings();
  const settings = query.data;
  return (
    <>
      <PageHeading
        title="Settings"
        subtitle="Configure department standing rules, email, and backup records."
      />
      {!settings && query.isError ? (
        <QueryMessage query={query} label="settings" />
      ) : (
        <AccountSkeleton
          id="dh-settings"
          data={settings}
          sample={SETTINGS_SKELETON_SAMPLE}
          label="Loading settings…"
        >
          {(settings) => (
            <Fragment
              key={settings === SETTINGS_SKELETON_SAMPLE ? "sample" : "live"}
            >
              <div className="mb-4">
                <BackupBanner settings={settings} />
              </div>
              <StandingRulesForm settings={settings} />
              <div className="grid items-start gap-4 xl:grid-cols-2">
                <EmailSettingsForm settings={settings} />
                <BackupRecordPanel settings={settings} />
              </div>
            </Fragment>
          )}
        </AccountSkeleton>
      )}
    </>
  );
}
