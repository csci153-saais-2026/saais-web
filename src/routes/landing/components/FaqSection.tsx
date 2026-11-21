import { ChevronDownIcon } from '@/components/icons'
import { Kicker } from '@/components/ui/kicker'
import { FAQ_ITEMS, FAQ_SECTION } from '@/routes/landing/landingData'

export function FaqSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 bg-background px-4 py-20 sm:px-8 md:py-[112px] lg:px-14"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[900px] text-center">
          <Kicker className="text-gold-deep">{FAQ_SECTION.kicker}</Kicker>
          <h2 className="mx-auto mt-4 max-w-[26ch] text-center font-heading text-[32px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[40px]">
            {FAQ_SECTION.title}
          </h2>
          <p className="mx-auto mt-[18px] max-w-[62ch] text-[17.5px] leading-[1.6] text-muted-foreground">
            {FAQ_SECTION.subhead}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-[820px] divide-y divide-border rounded-md border border-border bg-card">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group px-6 py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-foreground marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="pb-5 text-[14.5px] leading-[1.65] text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
