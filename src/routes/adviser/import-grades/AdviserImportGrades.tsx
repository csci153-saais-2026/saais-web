import { Link } from "react-router"
import { AdviserPage } from "../Adviser"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { Button } from "@/components/ui/button"
import { DownloadIcon, UploadIcon } from "@/components/icons"

export default function AdviserImportGrades() {
  return <AdviserPage title="Import grades">
    <PageHeading title="Import grades (JSON)" subtitle="For many advisees or terms at once" actions={<Button variant="outline"><DownloadIcon />Download template</Button>} />
    <Panel title="Upload a file" description="Every row is checked before anything is saved.">
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border bg-background p-8 text-center"><UploadIcon className="size-8 text-muted-2" /><p>Drop a <span className="font-mono">.json</span> file here, or <Button variant="link" className="px-1">choose a file</Button></p></div>
      <Button variant="outline" className="mt-4">Or try a sample file</Button>
    </Panel>
    <Panel title="Check results"><p className="py-5 text-sm text-muted-foreground">Choose a file to preview validation results.</p><div className="flex gap-3"><Button disabled>Save valid rows</Button><Button asChild variant="outline"><Link to="/adviser/encode-grades">Cancel</Link></Button></div></Panel>
  </AdviserPage>
}
