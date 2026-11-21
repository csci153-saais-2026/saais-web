import { HERO_PREVIEW } from '@/routes/landing/landingData'

export function HeroChecklistPreview() {
  return (
    <div className="relative z-[2] mt-12 md:mt-16 md:-mb-[190px]">
      <div className="relative overflow-hidden rounded-md border border-border bg-card">
        <img
          src={HERO_PREVIEW.src}
          alt={HERO_PREVIEW.alt}
          width={HERO_PREVIEW.width}
          height={HERO_PREVIEW.height}
          className="block h-auto w-full"
        />
        {/* Fade the screenshot's cut-off bottom edge into the page background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-b from-transparent via-background/70 to-background"
        />
      </div>
    </div>
  )
}
