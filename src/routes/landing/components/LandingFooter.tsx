import { Link } from "react-router";
import { NoteIcon } from "@/components/icons";
import { BrandMark } from "@/components/ui/brand-mark";
import { Kicker } from "@/components/ui/kicker";
import {
  FOOTER_BRAND,
  FOOTER_COLUMNS,
  FOOTER_LEGAL,
  FOOTER_SIGN_IN_NOTE,
} from "@/routes/landing/landingData";

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
                    {link.href.startsWith("/") ? (
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

        <p className="mt-[52px] max-w-[460px] border-t border-[#F6F2E4]/[0.12] pt-[34px] text-xs leading-[1.55] text-[#F6F2E4]/[0.45]">
          {FOOTER_SIGN_IN_NOTE}
        </p>

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
  );
}
