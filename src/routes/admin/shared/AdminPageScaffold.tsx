import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'

interface AdminPageScaffoldProps {
  title: string
  subtitle: string
  panelTitle: string
  description: string
}

export function AdminPageScaffold({
  title,
  subtitle,
  panelTitle,
  description,
}: AdminPageScaffoldProps) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-8">
      <PageHeading title={title} subtitle={subtitle} />
      <Panel title={panelTitle} description={description}>
        <p className="text-sm text-muted-foreground">
          The page layout is in place. Data, filters, and actions will be added in the
          corresponding Admin implementation steps.
        </p>
      </Panel>
    </div>
  )
}
