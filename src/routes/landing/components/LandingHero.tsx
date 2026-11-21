import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CheckIcon, LockIcon, NoteIcon, ShieldIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Kicker } from '@/components/ui/kicker'
import { HERO_CONTENT } from '@/routes/landing/landingData'

export interface LandingHeroProps {
  onRequestWalkthrough?: () => void
  children?: ReactNode
}

const COMPLIANCE_ICONS = {
  shield: ShieldIcon,
  check: CheckIcon,
  lock: LockIcon,
  file: NoteIcon,
} as const

export function LandingHero({ onRequestWalkthrough, children }: LandingHeroProps) {
  const handleWalkthrough = () => {
    if (onRequestWalkthrough) {
      onRequestWalkthrough()
      return
    }
    const target = document.getElementById('walkthrough')
    target?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="platform"
      className={`relative scroll-mt-20 overflow-visible bg-forest-deep px-4 pt-16 sm:px-8 md:pt-[104px] lg:px-14 ${
        children ? 'pb-0' : 'pb-20 md:pb-24'
      }`}
    >
      {/* Hero aura mesh — four corner-anchored blend-mode layers from DESIGN.md §2 */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="pointer-events-none absolute inset-0 translate-z-0 mix-blend-screen blur-[260px]"
          style={{
            background:
              'radial-gradient(circle at 24% 18%, rgba(74,107,34,0.55) 0%, transparent 45%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 translate-z-0 mix-blend-screen blur-[260px]"
          style={{
            background:
              'radial-gradient(circle at 78% 14%, rgba(47,74,18,0.45) 0%, transparent 42%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 translate-z-0 mix-blend-screen blur-[252px]"
          style={{
            background:
              'radial-gradient(circle at 40% 78%, rgba(246,226,174,0.18) 0%, transparent 50%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 translate-z-0 mix-blend-overlay blur-[198px]"
          style={{
            background:
              'radial-gradient(circle at 88% 88%, rgba(224,168,46,0.22) 0%, transparent 32%)',
          }}
        />
      </div>

      <div className="relative z-[1] mx-auto max-w-[1200px]">
        <div className="text-center">
          <Kicker className="text-gold">{HERO_CONTENT.kicker}</Kicker>

          <h1 className="mx-auto mt-[22px] max-w-[17ch] text-center font-heading text-[40px] leading-[1.06] font-bold tracking-[-0.01em] text-background sm:text-[52px] md:text-[64px]">
            {HERO_CONTENT.headline}
          </h1>

          <p className="mx-auto mt-6 max-w-[60ch] text-[17px] leading-[1.6] text-[#F6F2E4]/[0.78] md:text-[19px]">
            {HERO_CONTENT.subhead}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <Button
              type="button"
              size="lg"
              onClick={handleWalkthrough}
              className="rounded-lg border border-background bg-background px-[30px] py-[15px] text-base font-semibold text-forest-deep hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
            >
              {HERO_CONTENT.primaryCta}
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-lg border-[#F6F2E4]/30 bg-transparent px-[30px] py-[15px] text-base font-semibold text-background hover:border-background/60 hover:bg-transparent hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
            >
              <Link to={HERO_CONTENT.secondaryCtaHref}>
                {HERO_CONTENT.secondaryCta}
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path d="M15 3h6v6M21 3l-9 9" />
                  <path d="M18 13.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1h6.5" />
                </svg>
              </Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-x-[34px] gap-y-3.5">
            {HERO_CONTENT.complianceMarks.map((mark) => {
              const Icon = COMPLIANCE_ICONS[mark.icon]
              return (
                <div
                  key={mark.label}
                  className="flex items-center gap-2 text-[13.5px] text-[#F6F2E4]/[0.68]"
                >
                  <Icon className="size-4 shrink-0 text-gold" />
                  <span>{mark.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {children}
      </div>

      {/* Full-width wavy fade: stacked translucent waves dissolve the green hero into the page background */}
      {children && (
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 280"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[110px] w-full sm:h-[200px] text-background md:h-[360px] lg:h-[440px]"
        >
          <path
            fill="currentColor"
            fillOpacity="0.22"
            d="M0 52C160 12 300 92 470 56S800 8 980 50 1300 86 1440 36V280H0Z"
          />
          <path
            fill="currentColor"
            fillOpacity="0.42"
            d="M0 104C180 148 330 66 520 108S850 150 1020 100 1320 64 1440 112V280H0Z"
          />
          <path
            fill="currentColor"
            fillOpacity="0.68"
            d="M0 168C150 128 320 200 500 166S840 124 1010 170 1310 196 1440 150V280H0Z"
          />
          <path
            fill="currentColor"
            fillOpacity="1"
            d="M0 226C200 196 340 252 540 224S880 196 1060 228 1330 244 1440 214V280H0Z"
          />
        </svg>
      )}
    </section>
  )
}
