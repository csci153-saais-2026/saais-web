import { Kicker } from '@/components/ui/kicker'
import { StatusBadge } from '@/components/ui/status-badge'
import { HERO_CHECKLIST_META, HERO_CHECKLIST_ROWS } from '@/routes/landing/landingData'

export function HeroChecklistPreview() {
  return (
    <div className="relative z-[2] mt-12 pb-12 md:mt-16 md:-mb-[190px] md:pb-0">
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-[0_40px_90px_rgba(15,26,6,0.30)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-5 py-4 md:px-[26px] md:py-5">
          <div>
            <div className="text-[15px] font-semibold text-foreground">
              {HERO_CHECKLIST_META.title}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted-2">
              {HERO_CHECKLIST_META.subtitle}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {HERO_CHECKLIST_META.badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-[3px] bg-secondary px-[9px] py-[2px] text-xs font-semibold tracking-[0.01em] whitespace-nowrap text-primary"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div>
          {HERO_CHECKLIST_ROWS.map((row) => (
            <div
              key={`${row.code}-${row.title}`}
              className="flex flex-col gap-2 border-b border-line-soft px-5 py-3.5 transition-colors hover:bg-line-soft md:grid md:grid-cols-[112px_minmax(0,1fr)_56px_210px_132px_64px] md:items-center md:gap-3.5 md:px-[26px] md:py-[13px]"
            >
              <div className="flex items-center justify-between gap-2 md:contents">
                <span className="font-mono text-[13px] font-medium text-foreground tabular-nums">
                  {row.code}
                </span>
                <div className="md:hidden">
                  <StatusBadge status={row.status} />
                </div>
              </div>

              <div>
                <div className="text-[13.5px] text-foreground">{row.title}</div>
                {row.provenance && (
                  <div className="mt-[3px] text-[11.5px] text-gold-deep">
                    {row.provenance}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 text-[12.5px] text-muted-2 md:contents">
                <div className="flex items-center gap-3 md:contents">
                  <span className="tabular-nums">
                    {row.units}
                    <span className="md:hidden"> units</span>
                  </span>
                  <span>{row.term}</span>
                </div>
                <div className="hidden md:block">
                  <StatusBadge status={row.status} />
                </div>
                <div className="font-mono text-[13.5px] font-medium text-foreground tabular-nums md:text-right">
                  {row.grade}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 bg-background px-5 py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-[26px] md:py-[18px]">
          <p className="max-w-[62ch] text-[12.5px] text-muted-foreground">
            {HERO_CHECKLIST_META.footerNote}
          </p>

          <div className="flex shrink-0 items-center gap-[30px]">
            <div>
              <Kicker className="text-muted-2">Term GWA</Kicker>
              <div className="mt-1 font-heading text-[22px] leading-[1.06] font-bold tracking-[-0.01em] text-primary tabular-nums">
                {HERO_CHECKLIST_META.termGwa}
              </div>
            </div>
            <div>
              <Kicker className="text-muted-2">Cumulative GWA</Kicker>
              <div className="mt-1 font-heading text-[22px] leading-[1.06] font-bold tracking-[-0.01em] text-primary tabular-nums">
                {HERO_CHECKLIST_META.cumulativeGwa}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
