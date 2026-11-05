import * as React from "react"
import { BrandMark } from "@/components/ui/brand-mark"
import { Kicker } from "@/components/ui/kicker"
import { cn } from "@/lib/utils"
import { HowToUse } from "@/routes/styleguide/how-to-use"
import { ComponentSections } from "@/routes/styleguide/component-sections"
import { Part } from "@/routes/styleguide/parts"
import { TokenSections } from "@/routes/styleguide/token-sections"

const nav = [
  {
    group: "Tokens",
    items: [
      ["colors", "Colors"],
      ["status-colors", "Status colors"],
      ["typography", "Typography"],
      ["spacing", "Spacing & layout"],
      ["radius", "Radius & focus"],
      ["icons", "Icons"],
    ],
  },
  {
    group: "Components",
    items: [
      ["button", "Button"],
      ["status-badge", "Status badge"],
      ["badge", "Badge & kicker"],
      ["form", "Form controls"],
      ["alert", "Alert & notices"],
      ["panel", "Panel & stat tile"],
      ["table", "Table"],
      ["tabs", "Tabs & breadcrumb"],
      ["progress", "Progress & distribution"],
      ["avatar", "Avatar & record header"],
      ["dialog", "Dialog"],
      ["popover", "Popover & notifications"],
      ["sidebar", "Sidebar"],
      ["page-heading", "Page heading"],
      ["checklist", "Checklist term group"],
      ["sign-in", "Sign-in"],
    ],
  },
  {
    group: "How to use",
    items: [
      ["how-import", "Importing"],
      ["how-ui", "UI components"],
      ["how-features", "Feature components"],
    ],
  },
] as const

/** Live style guide: every token and shared component rendered from the real source. */
export default function StyleguidePage() {
  const [active, setActive] = React.useState<string>("colors")

  React.useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("section[id]")
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: "-20% 0px -70% 0px" }
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 h-dvh w-sidebar shrink-0 overflow-y-auto bg-sidebar px-3 pt-5.5 pb-6 text-sidebar-foreground">
        <div className="mb-2 border-b border-sidebar-border px-2 pb-4">
          <BrandMark caption="Style guide" />
        </div>
        <nav aria-label="Style guide">
          {nav.map((g) => (
            <div key={g.group}>
              <Kicker className="block px-4 pt-4.5 pb-2 text-sidebar-foreground/55">{g.group}</Kicker>
              <ul className="grid gap-0.5">
                {g.items.map(([id, label]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      aria-current={active === id ? "true" : undefined}
                      className={cn(
                        "block rounded-[5px] border-l-[3px] border-transparent py-1.5 pr-3 pl-3.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-white",
                        active === id && "border-sidebar-primary bg-sidebar-accent font-semibold text-white"
                      )}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 max-w-[1120px] flex-1 px-gutter pt-12 pb-24">
        <header className="mb-10 border-b-2 border-foreground pb-7">
          <Kicker className="text-gold-deep">SAAIS · Design system</Kicker>
          <h1 className="mt-2 text-display-l">Style guide</h1>
          <p className="mt-2.5 max-w-[64ch] text-muted-foreground">
            Tokens and the shared components built from them, rendered live from <code>src/components</code>. Click a
            swatch to copy its value.
          </p>
        </header>

        <Part kicker="Part 1" title="Tokens" />
        <TokenSections />

        <Part kicker="Part 2" title="Components" />
        <ComponentSections />

        <Part kicker="Part 3" title="How to use" />
        <HowToUse />
      </main>
    </div>
  )
}
