import { Link } from 'react-router'
import { NoteIcon } from '@/components/icons'
import { BrandMark } from '@/components/ui/brand-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kicker } from '@/components/ui/kicker'
import {
  FOOTER_BRAND,
  FOOTER_COLUMNS,
  FOOTER_LEGAL,
  FOOTER_NEWSLETTER,
} from '@/routes/landing/landingData'

export function LandingFooter() {
  return (
    <footer className="bg-[#16230A] px-4 pt-16 pb-[34px] sm:px-8 md:pt-[76px] lg:px-14">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[290px_repeat(4,minmax(0,1fr))] lg:gap-11">
          <div>
            <BrandMark className="text-background" />
            <p className="mt-3.5 text-[13px] leading-[1.62] text-[#F6F2E4]/[0.55]">
              {FOOTER_BRAND.description}
            </p>
            <div className="mt-5 flex gap-2.5">
              <a
                href="#walkthrough"
                aria-label="Request a walkthrough"
                className="flex size-[34px] items-center justify-center rounded-full border border-[#F6F2E4]/[0.16] text-[#F6F2E4]/[0.62] transition-colors hover:border-[#F6F2E4]/40 hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="1.6" />
                  <path d="M3.6 6l8.4 6.6L20.4 6" />
                </svg>
              </a>
              <Link
                to="/docs"
                aria-label="Documentation"
                className="flex size-[34px] items-center justify-center rounded-full border border-[#F6F2E4]/[0.16] text-[#F6F2E4]/[0.62] transition-colors hover:border-[#F6F2E4]/40 hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <NoteIcon className="size-4" />
              </Link>
              <Link
                to="/docs/openapi"
                aria-label="OpenAPI contract"
                className="flex size-[34px] items-center justify-center rounded-full border border-[#F6F2E4]/[0.16] text-[#F6F2E4]/[0.62] transition-colors hover:border-[#F6F2E4]/40 hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 3h6v6M21 3l-9 9" />
                  <path d="M18 13.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1h6.5" />
                </svg>
              </Link>
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <Kicker className="text-gold">{col.title}</Kicker>
              <ul className="mt-3.5 list-none p-0">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link
                        to={link.href}
                        className="inline-block rounded-sm py-[5px] text-[13.5px] text-[#F6F2E4]/[0.62] transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="inline-block rounded-sm py-[5px] text-[13.5px] text-[#F6F2E4]/[0.62] transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          id="release-notes"
          className="mt-[52px] grid scroll-mt-20 grid-cols-1 gap-8 border-t border-[#F6F2E4]/[0.12] pt-[34px] lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-11"
        >
          <div className="hidden lg:block" />
          <div className="max-w-[460px]">
            <Kicker className="text-gold">{FOOTER_NEWSLETTER.kicker}</Kicker>
            <p className="mt-3.5 text-[13px] leading-[1.6] text-[#F6F2E4]/[0.62]">
              {FOOTER_NEWSLETTER.description}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder={FOOTER_NEWSLETTER.placeholder}
                aria-label="Institutional email for release notes"
                className="h-auto flex-1 rounded-sm border-[#F6F2E4]/[0.16] bg-[#F6F2E4]/[0.06] px-4 py-[9px] text-[13.5px] text-background placeholder:text-[#F6F2E4]/[0.45]"
              />
              <Button
                asChild
                size="sm"
                className="rounded-lg border border-background bg-background px-[18px] py-[9px] text-[13.5px] font-semibold text-forest-deep hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
              >
                <Link to="/docs">{FOOTER_NEWSLETTER.buttonLabel}</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs leading-[1.55] text-[#F6F2E4]/[0.45]">
              {FOOTER_NEWSLETTER.signInNote}
            </p>
          </div>
        </div>

        <div className="mt-11 flex flex-wrap items-center justify-between gap-5 border-t border-[#F6F2E4]/[0.12] pt-6 text-[12.5px] text-[#F6F2E4]/[0.45]">
          <div>{FOOTER_LEGAL.copyright}</div>
          <div className="flex flex-wrap gap-6">
            {FOOTER_LEGAL.links.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
