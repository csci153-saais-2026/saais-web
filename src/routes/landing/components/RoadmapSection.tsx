import { Kicker } from '@/components/ui/kicker'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { ROADMAP_PHASES, ROADMAP_SECTION } from '@/routes/landing/landingData'

export function RoadmapSection() {
  return (
    <section
      id="roadmap"
      className="bg-background px-4 py-20 sm:px-8 md:py-[112px] lg:px-14"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[900px] text-center">
          <Kicker className="text-gold-deep">{ROADMAP_SECTION.kicker}</Kicker>
          <h2 className="mx-auto mt-4 max-w-[26ch] text-center font-heading text-[32px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[40px]">
            {ROADMAP_SECTION.title}
          </h2>
          <p className="mx-auto mt-[18px] max-w-[62ch] text-[17.5px] leading-[1.6] text-muted-foreground">
            {ROADMAP_SECTION.subhead}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-5">
          {ROADMAP_PHASES.map((item) => {
            const isBuilt = item.status === 'Built'
            return (
              <div
                key={item.phase}
                className={cn(
                  'rounded-md border border-border border-t-[3px] bg-card px-6 py-[26px]',
                  isBuilt ? 'border-t-primary' : 'border-t-border',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Kicker className="text-muted-2">{item.phase}</Kicker>
                  <StatusBadge
                    status={isBuilt ? 'passed' : 'not-taken'}
                    className="rounded-sm"
                  >
                    {item.status}
                  </StatusBadge>
                </div>
                <h3 className="mt-3.5 font-heading text-[17px] leading-[1.3] font-bold tracking-[-0.02em] text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.58] text-muted-foreground">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
