import { ChartIcon, CheckIcon, GridIcon, ListIcon, UserIcon, UsersIcon } from '@/components/icons'
import { Card } from '@/components/ui/card'
import { Kicker } from '@/components/ui/kicker'
import { PORTALS_SECTION, PORTAL_CARDS, type PortalCard } from '@/routes/landing/landingData'

function CogIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1L5.4 5.4" />
    </svg>
  )
}

function PortalIcon({ icon }: { icon: PortalCard['icon'] }) {
  if (icon === 'user') return <UserIcon className="size-7" />
  if (icon === 'users') return <UsersIcon className="size-7" />
  if (icon === 'chart') return <ChartIcon className="size-7" />
  if (icon === 'list') return <ListIcon className="size-7" />
  if (icon === 'grid') return <GridIcon className="size-7" />
  return <CogIcon className="size-7" />
}

export function PortalsOverviewSection() {
  return (
    <section
      id="portals"
      className="scroll-mt-20 bg-background px-4 pt-16 pb-20 sm:px-8 md:pt-[248px] md:pb-[112px] lg:px-14"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[900px] text-center">
          <Kicker className="text-gold-deep">{PORTALS_SECTION.kicker}</Kicker>
          <h2 className="mx-auto mt-4 max-w-[26ch] text-center font-heading text-[32px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[44px]">
            {PORTALS_SECTION.title}
          </h2>
          <p className="mx-auto mt-[18px] max-w-[62ch] text-[17.5px] leading-[1.6] text-muted-foreground">
            {PORTALS_SECTION.subhead}
          </p>
        </div>

        <div className="mt-[52px] grid grid-cols-1 gap-[26px] md:grid-cols-2 lg:grid-cols-3">
          {PORTAL_CARDS.map((card) => (
            <Card
              key={card.id}
              className="flex flex-col gap-0 rounded-md border border-border bg-card px-8 py-[34px] shadow-none ring-0"
            >
              <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-cream-deep text-primary">
                <PortalIcon icon={card.icon} />
              </div>

              <h3 className="mt-[22px] font-heading text-[24px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground">
                {card.title}
              </h3>

              <p className="mt-3 flex-grow text-[14.5px] leading-[1.62] text-muted-foreground">
                {card.description}
              </p>

              <ul className="mt-[22px] list-none p-0">
                {card.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-[9px] border-t border-line-soft py-[9px] text-[13.5px] text-muted-foreground"
                  >
                    <CheckIcon className="mt-0.5 size-[15px] shrink-0 text-forest-soft" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
