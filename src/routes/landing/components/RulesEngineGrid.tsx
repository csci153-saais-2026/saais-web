import { CheckIcon, ClockIcon, LockIcon, SwapIcon } from '@/components/icons'
import { Kicker } from '@/components/ui/kicker'
import {
  RULES_ENGINE_CARDS,
  RULES_ENGINE_SECTION,
  type RulesEngineCard,
} from '@/routes/landing/landingData'

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3l9 4.8-9 4.8-9-4.8z" />
      <path d="M3 12.4l9 4.8 9-4.8M3 16.9l9 4.8 9-4.8" />
    </svg>
  )
}

function NodeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="18" cy="12" r="2.6" />
      <circle cx="6" cy="18" r="2.6" />
      <path d="M8.4 7.2l7.2 3.6M8.4 16.8l7.2-3.6" />
    </svg>
  )
}

function RuleIcon({ icon }: { icon: RulesEngineCard['icon'] }) {
  if (icon === 'layers') return <LayersIcon className="size-5 shrink-0" />
  if (icon === 'clock') return <ClockIcon className="size-5 shrink-0" />
  if (icon === 'swap') return <SwapIcon className="size-5 shrink-0" />
  if (icon === 'node') return <NodeIcon className="size-5 shrink-0" />
  if (icon === 'check') return <CheckIcon className="size-5 shrink-0" />
  return <LockIcon className="size-5 shrink-0" />
}

export function RulesEngineGrid() {
  return (
    <section
      id="rules-engine"
      className="bg-card px-4 py-20 sm:px-8 md:py-[112px] lg:px-14"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[900px] text-center">
          <Kicker className="text-gold-deep">
            {RULES_ENGINE_SECTION.kicker}
          </Kicker>
          <h2 className="mx-auto mt-4 max-w-[26ch] text-center font-heading text-[32px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[44px]">
            {RULES_ENGINE_SECTION.title}
          </h2>
          <p className="mx-auto mt-[18px] max-w-[62ch] text-[17.5px] leading-[1.6] text-muted-foreground">
            {RULES_ENGINE_SECTION.subhead}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {RULES_ENGINE_CARDS.map((rule) => (
            <div
              key={rule.title}
              className="rounded-md border border-border bg-card p-7"
            >
              <div className="flex items-center gap-[11px] text-primary">
                <RuleIcon icon={rule.icon} />
                <h3 className="font-heading text-[17px] leading-[1.3] font-bold tracking-[-0.02em] text-foreground">
                  {rule.title}
                </h3>
              </div>
              <p className="mt-3 text-[13.5px] leading-[1.65] text-muted-foreground">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
