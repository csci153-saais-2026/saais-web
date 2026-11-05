import * as React from "react"
import { Link } from "react-router"
import { BrandMark } from "@/components/ui/brand-mark"
import { Kicker } from "@/components/ui/kicker"

/** Split-screen sign-in frame: forest story panel on the left, cream form column on the right. */
function AuthLayout({
  kicker,
  headline,
  bullets,
  children,
}: {
  kicker: string
  headline: string
  bullets: { icon: React.ReactNode; text: string }[]
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <section className="flex flex-col justify-between bg-forest-deep px-8 py-10 text-primary-foreground lg:px-[52px]">
        <Link to="/">
          <BrandMark />
        </Link>
        <div className="my-12 max-w-[520px]">
          <Kicker className="text-gold">{kicker}</Kicker>
          <h1 className="mt-4 text-4xl leading-[1.1] text-primary-foreground lg:text-5xl">{headline}</h1>
          <ul className="mt-8 grid gap-3.5 border-t border-sidebar-border pt-6 text-sm text-primary-foreground/80">
            {bullets.map((b) => (
              <li key={b.text} className="flex items-center gap-3">
                <span className="text-gold" aria-hidden>
                  {b.icon}
                </span>
                {b.text}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </section>
    </div>
  )
}

export { AuthLayout }
