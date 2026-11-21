import { PLATFORM_STATEMENT } from '@/routes/landing/landingData'

export function MissionBand() {
  return (
    <section className="bg-card px-4 pt-20 pb-14 sm:px-8 md:pt-[112px] md:pb-[72px] lg:px-14">
      <div className="mx-auto max-w-[980px] text-center">
        <img
          src="/logo-mark.png"
          alt=""
          className="mx-auto size-[72px] rounded-[14px]"
        />
        <h2 className="mx-auto mt-[30px] max-w-[52ch] text-center font-heading text-[24px] leading-[1.28] font-bold tracking-[-0.02em] text-foreground md:text-[30px]">
          {PLATFORM_STATEMENT}
        </h2>
      </div>
    </section>
  )
}
