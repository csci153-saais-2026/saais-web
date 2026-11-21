import { CheckIcon, ChevronRightIcon } from '@/components/icons'
import { Kicker } from '@/components/ui/kicker'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FEATURE_TABS, FEATURE_TABS_SECTION } from '@/routes/landing/landingData'

export function FeatureTabsSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-card px-4 pt-0 pb-20 sm:px-8 md:pb-[112px] lg:px-14"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="mx-auto max-w-[30ch] text-center font-heading text-[32px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[40px]">
            {FEATURE_TABS_SECTION.title}
          </h2>
        </div>

        <Tabs defaultValue="Checklist" className="mt-10 gap-0">
          <TabsList
            variant="line"
            className="flex h-auto! w-full flex-wrap items-center justify-center gap-2 rounded-none border-b border-border bg-transparent p-0"
          >
            {FEATURE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-5 pt-3 pb-[13px] text-[15px] font-medium text-muted-2 shadow-none after:hidden hover:text-foreground data-active:border-gold data-active:bg-transparent data-active:font-semibold data-active:text-foreground data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground sm:px-[26px]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {FEATURE_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-10 md:mt-[52px]">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
                <div>
                  <h3 className="max-w-[20ch] font-heading text-[28px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[34px]">
                    {tab.heading}
                  </h3>
                  <p className="mt-3.5 text-base leading-[1.65] text-muted-foreground">
                    {tab.description}
                  </p>

                  <div className="mt-6">
                    {tab.bullets.map((bullet) => (
                      <div
                        key={bullet.title}
                        className="flex items-start gap-3 border-t border-border py-3.5"
                      >
                        <CheckIcon className="mt-[1px] size-[17px] shrink-0 text-gold-deep" />
                        <div>
                          <div className="text-[14.5px] font-semibold text-foreground">
                            {bullet.title}
                          </div>
                          <div className="mt-[3px] text-[13.5px] leading-[1.55] text-muted-foreground">
                            {bullet.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-[26px]">
                    <a
                      href={tab.linkHref}
                      className="inline-flex items-center gap-[7px] rounded-sm text-[14.5px] font-semibold text-primary transition-colors hover:text-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {tab.linkLabel}
                      <ChevronRightIcon className="size-[15px]" />
                    </a>
                  </div>
                </div>

                <div className="overflow-hidden rounded-md border border-border bg-card shadow-[0_18px_44px_rgba(15,26,6,0.08)]">
                  <div className="border-b border-border bg-background px-5 py-[18px] text-[13.5px] font-semibold text-foreground">
                    {tab.panelTitle}
                  </div>

                  <div>
                    {tab.panelRows.map((row) => (
                      <div
                        key={`${row.code}-${row.title}`}
                        className="grid grid-cols-[72px_minmax(0,1fr)_32px_108px_72px] items-center gap-2 border-b border-line-soft px-4 py-[13px] sm:grid-cols-[88px_minmax(0,1fr)_40px_120px_92px] sm:px-5"
                      >
                        <span className="font-mono text-[13px] font-medium text-foreground tabular-nums">
                          {row.code}
                        </span>
                        <div className="text-[13px] text-foreground">{row.title}</div>
                        <div className="text-[12.5px] text-muted-2 tabular-nums">
                          {row.units}
                        </div>
                        <StatusBadge status={row.status}>{row.statusLabel}</StatusBadge>
                        <div className="text-right text-[11.5px] text-muted-2">
                          {row.outcome}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-4 bg-cream-deep px-5 py-[18px]">
                    <p className="max-w-[60%] text-[12.5px] text-muted-foreground">
                      {tab.panelFooterNote}
                    </p>
                    <div className="shrink-0 text-right">
                      <Kicker className="text-muted-2">{tab.panelMetricLabel}</Kicker>
                      <div className="mt-1 font-heading text-[26px] leading-[1.06] font-bold tracking-[-0.01em] text-primary tabular-nums">
                        {tab.panelMetricValue}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
