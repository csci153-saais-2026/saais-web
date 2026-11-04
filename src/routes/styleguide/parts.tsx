import * as React from "react"
import { cn } from "@/lib/utils"
import { Kicker } from "@/components/ui/kicker"

/** Big "Tokens" / "Components" divider between the two halves of the guide. */
function Part({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mt-16 mb-2 flex items-baseline gap-3.5 first:mt-0">
      <Kicker className="text-gold-deep">{kicker}</Kicker>
      <h2 className="text-4xl">{title}</h2>
    </div>
  )
}

/** One documented item: anchor id, title, description, content. */
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <header className="mb-4 border-b border-border pb-3">
        <h3 className="font-heading text-[22px] leading-tight font-bold tracking-tight">{title}</h3>
        {description && <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{description}</p>}
      </header>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

/** The white (or cream) box a live component sits in. */
function Specimen({
  children,
  className,
  flush = false,
  cream = false,
}: {
  children: React.ReactNode
  className?: string
  flush?: boolean
  cream?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border",
        cream ? "bg-background" : "bg-card",
        flush ? "overflow-hidden" : "p-6",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Small caption above a group of variants. */
function Caption({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-xs font-semibold text-muted-2">{children}</span>
}

/** Usage snippet shown under a specimen. */
function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-forest-deep px-4 py-3.5 font-mono text-[12.5px] leading-relaxed whitespace-pre text-accent">
      {children}
    </pre>
  )
}

export { Part, Section, Specimen, Caption, Code }
