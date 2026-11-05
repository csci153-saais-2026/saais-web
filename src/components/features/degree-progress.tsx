import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Panel } from "@/components/features/panel"

/** "Your degree, in view" panel: earned units vs. required, with progress bar. */
function DegreeProgress({
  program,
  curriculum,
  earned,
  required,
  action,
  children,
}: {
  program: string
  curriculum: string
  earned: number
  required: number
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  const pct = Math.round((earned / required) * 100)
  return (
    <Panel title="Your degree, in view" description={`${program} · Curriculum ${curriculum}`} action={action}>
      <div className="mb-2 flex justify-between text-sm">
        <span>{earned} units earned</span>
        <span>
          {pct}% of {required} units
        </span>
      </div>
      <Progress value={pct} aria-label="Degree progress" className="h-2" />
      {children && <p className="mt-4 text-sm text-muted-foreground">{children}</p>}
    </Panel>
  )
}

export { DegreeProgress }
