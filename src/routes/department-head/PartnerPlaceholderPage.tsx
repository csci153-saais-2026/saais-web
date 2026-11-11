import { AlertIcon } from "@/components/icons"
import { Panel } from "@/components/features/panel"
import { PageHeading } from "@/components/features/page-heading"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SampleFooter } from "@/components/features/sample-footer"

interface PartnerPlaceholderProps {
  title: string
  subtitle: string
  screenNumber: number
}

export function PartnerPlaceholderPage({ title, subtitle, screenNumber }: PartnerPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeading title={title} subtitle={subtitle} />
      <Alert className="bg-muted/40 border-border">
        <AlertIcon />
        <AlertTitle className="font-semibold text-foreground">Assigned to Partner (Developer 2 — Matt)</AlertTitle>
        <AlertDescription className="text-muted-foreground mt-1">
          This screen (Screen {screenNumber}: {title}) is reserved for Developer 2 in accordance with the 50/50 division of work detailed in{" "}
          <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">DEPARTMENT_HEAD_WORK_SPLIT.md</code>.
        </AlertDescription>
      </Alert>

      <Panel title={`${title} Preview`} description="Awaiting partner implementation in accordance with milestone plan.">
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <p className="text-base font-medium">Interface scaffold ready for partner development.</p>
          <p className="text-sm mt-1">Shared design tokens, layout shell, and component library are fully available.</p>
        </div>
      </Panel>
      <SampleFooter>
        Sample records for presentation · Reference date: 15 August 2025 · Static design
      </SampleFooter>
    </div>
  )
}
