import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Kicker } from '@/components/ui/kicker'
import { cn } from '@/lib/utils'
import {
  WORKFLOW_SECTION,
  WORKFLOW_STEPS,
  type WorkflowStepId,
} from '@/routes/landing/landingData'

export function WorkflowStepsSection() {
  const [activeId, setActiveId] = useState<WorkflowStepId>(WORKFLOW_SECTION.defaultStep)
  const activeStep =
    WORKFLOW_STEPS.find((step) => step.id === activeId) ?? WORKFLOW_STEPS[0]

  return (
    <section
      id="workflow"
      className="scroll-mt-20 bg-background px-4 py-20 sm:px-8 md:py-[112px] lg:px-14"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="mx-auto max-w-[26ch] text-center font-heading text-[32px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[40px]">
            {WORKFLOW_SECTION.title}
          </h2>
        </div>

        <div
          role="group"
          aria-label="Advising workflow steps"
          className="mt-10 flex flex-wrap items-center justify-center gap-2.5"
        >
          {WORKFLOW_STEPS.map((step) => {
            const isActive = step.id === activeStep.id
            return (
              <Button
                key={step.id}
                type="button"
                variant="outline"
                aria-pressed={isActive}
                onClick={() => setActiveId(step.id)}
                className={cn(
                  'h-auto rounded-lg px-[22px] py-2.5 text-sm font-semibold',
                  isActive
                    ? 'border-primary bg-primary text-background hover:bg-primary hover:text-background'
                    : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground',
                )}
              >
                {step.label}
              </Button>
            )
          })}
        </div>

        <div
          id="landing-step-panel"
          className="mt-9 grid grid-cols-1 items-start gap-8 rounded-md border border-border bg-card p-6 sm:p-8 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-background tabular-nums">
                {activeStep.stepNumber}
              </div>
              <Kicker className="text-muted-2">
                Step {activeStep.stepNumber} of {WORKFLOW_STEPS.length}
              </Kicker>
            </div>

            <h3 className="mt-[18px] font-heading text-[26px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[30px]">
              {activeStep.label}
            </h3>

            <p className="mt-3 text-[15.5px] leading-[1.65] text-muted-foreground">
              {activeStep.description}
            </p>
          </div>

          <div>
            <Kicker className="text-muted-2">What this step writes</Kicker>

            <div className="mt-3">
              {activeStep.writes.map((write) => (
                <div
                  key={write.entity}
                  className="grid grid-cols-1 gap-1 border-t border-line-soft py-[13px] sm:grid-cols-[190px_minmax(0,1fr)] sm:items-baseline sm:gap-4"
                >
                  <span className="font-mono text-[13px] font-medium text-foreground">
                    {write.entity}
                  </span>
                  <div className="text-[13.5px] leading-[1.55] text-muted-foreground">
                    {write.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
