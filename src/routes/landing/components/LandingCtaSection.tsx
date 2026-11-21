import { Button } from '@/components/ui/button'
import { CLOSING_CTA } from '@/routes/landing/landingData'

export interface LandingCtaSectionProps {
  onRequestWalkthrough?: () => void
}

export function LandingCtaSection({ onRequestWalkthrough }: LandingCtaSectionProps) {
  return (
    <section
      id="walkthrough"
      className="relative scroll-mt-20 overflow-hidden bg-forest-deep px-4 py-24 sm:px-8 md:py-32 lg:px-14"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-[300px] left-1/2 -ml-[450px] size-[900px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(224,168,46,0.16), rgba(224,168,46,0) 62%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1200px] text-center">
        <h2 className="mx-auto max-w-[24ch] text-center font-heading text-[36px] leading-[1.06] font-bold tracking-[-0.01em] text-background md:text-[48px]">
          {CLOSING_CTA.title}
        </h2>

        <p className="mx-auto mt-5 max-w-[58ch] text-[17.5px] leading-[1.6] text-[#F6F2E4]/[0.72]">
          {CLOSING_CTA.subhead}
        </p>

        <div className="mt-[34px] flex justify-center">
          <Button
            type="button"
            size="lg"
            onClick={onRequestWalkthrough}
            className="rounded-lg border border-background bg-background px-[30px] py-[15px] text-base font-semibold text-forest-deep hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            {CLOSING_CTA.buttonLabel}
          </Button>
        </div>

        <div className="mt-4 text-[13px] text-[#F6F2E4]/[0.55]">
          {CLOSING_CTA.contactEmail}
        </div>
      </div>
    </section>
  )
}
