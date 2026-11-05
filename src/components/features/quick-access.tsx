import { ChevronRightIcon } from "@/components/icons"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Kicker } from "@/components/ui/kicker"

/** Row of shortcut buttons under the dashboard stats. */
function QuickAccess({ links }: { links: { label: string; to: string }[] }) {
  return (
    <section aria-label="Quick Access" className="mb-6 flex flex-wrap items-center gap-2.5">
      <Kicker className="mr-1">Quick access</Kicker>
      {links.map((l) => (
        <Button key={`${l.to}-${l.label}`} asChild variant="outline" className="bg-card font-semibold">
          <Link to={l.to}>
            {l.label}
            <ChevronRightIcon />
          </Link>
        </Button>
      ))}
    </section>
  )
}

export { QuickAccess }
