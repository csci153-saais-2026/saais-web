import { CheckIcon, LockIcon, ShieldIcon } from '@/components/icons'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Kicker } from '@/components/ui/kicker'
import {
  BIG_NUMBER_SECTION,
  TESTIMONIAL_PLACEHOLDER,
  TRUST_BADGES,
  TRUST_BADGES_SECTION,
  type TrustBadgeItem,
} from '@/routes/landing/landingData'

const BADGE_ICONS: Record<TrustBadgeItem['icon'], typeof ShieldIcon> = {
  shield: ShieldIcon,
  check: CheckIcon,
  lock: LockIcon,
}

export function TrustAndMetricsSection() {
  return (
    <>
      {/* Placeholder quote band */}
      <section className="bg-card px-4 py-20 sm:px-8 md:py-[104px] lg:px-14">
        <div className="mx-auto max-w-[900px] text-center">
          <div
            className="h-8 font-heading text-[64px] leading-[0.5] text-gold-deep"
            aria-hidden="true"
          >
            &ldquo;
          </div>
          <blockquote className="mx-auto max-w-[52ch] text-center font-heading text-[24px] leading-[1.36] font-medium tracking-[-0.02em] text-foreground md:text-[30px]">
            {TESTIMONIAL_PLACEHOLDER.quote}
          </blockquote>

          <div className="mt-8 flex items-center justify-center gap-3.5">
            <Avatar className="size-[46px] bg-cream-deep">
              <AvatarFallback className="bg-cream-deep text-lg font-semibold tracking-[0.02em] text-primary">
                {TESTIMONIAL_PLACEHOLDER.initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="text-[14.5px] font-semibold text-foreground">
                {TESTIMONIAL_PLACEHOLDER.author}
              </div>
              <div className="text-[13px] text-muted-2">
                {TESTIMONIAL_PLACEHOLDER.role}
              </div>
            </div>
          </div>

          <p className="mt-[30px] text-[12.5px] text-muted-2">
            {TESTIMONIAL_PLACEHOLDER.notice}
          </p>
        </div>
      </section>

      {/* Compliance commitments */}
      <section
        id="compliance"
        className="scroll-mt-20 bg-cream-deep px-4 py-16 sm:px-8 md:py-[86px] lg:px-14"
      >
        <div className="mx-auto max-w-[1200px]">
          <h2 className="sr-only">{TRUST_BADGES_SECTION.kicker}</h2>
          <Kicker className="block text-center text-muted-2">
            {TRUST_BADGES_SECTION.kicker}
          </Kicker>

          <div className="mt-[30px] grid grid-cols-1 gap-[22px] md:grid-cols-3">
            {TRUST_BADGES.map((badge) => {
              const Icon = BADGE_ICONS[badge.icon]
              return (
                <div
                  key={badge.title}
                  className="rounded-md border border-border bg-card px-7 py-[30px]"
                >
                  <div className="flex size-[52px] shrink-0 items-center justify-center rounded-md bg-cream-deep text-primary">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mt-5 font-heading text-lg leading-[1.3] font-bold tracking-[-0.02em] text-foreground">
                    {badge.title}
                  </h3>
                  <p className="mt-2.5 text-[13.5px] leading-[1.62] text-muted-foreground">
                    {badge.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Big-number schema metrics band */}
      <section className="bg-primary px-4 py-20 sm:px-8 md:py-[100px] lg:px-14">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <div className="font-heading text-[72px] leading-none font-bold tracking-[-0.01em] text-background tabular-nums md:text-[104px]">
              {BIG_NUMBER_SECTION.value}
            </div>
            <p className="mx-auto mt-[18px] max-w-[42ch] text-lg text-[#F6F2E4]/[0.78]">
              {BIG_NUMBER_SECTION.caption}
            </p>
          </div>

          <div className="mt-[60px] grid grid-cols-1 gap-[30px] border-t border-[#F6F2E4]/[0.16] pt-11 md:grid-cols-3">
            {BIG_NUMBER_SECTION.stats.map((stat) => (
              <div key={stat.label} className="px-5 text-center">
                <div className="font-heading text-[34px] leading-[1.06] font-bold tracking-[-0.01em] text-background tabular-nums">
                  {stat.value}
                </div>
                <div className="mx-auto mt-2.5 max-w-[24ch] text-[13.5px] leading-[1.5] text-[#F6F2E4]/[0.62]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
