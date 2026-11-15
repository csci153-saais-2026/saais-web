import * as React from "react"
import { MenuIcon } from "@/components/icons"
import { Link } from "react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export type Crumb = { label: string; to?: string }

function BreadcrumbCrumb({
  crumb,
  current = false,
}: {
  crumb: Crumb
  current?: boolean
}) {
  if (current) {
    return (
      <BreadcrumbPage className="font-semibold">
        {crumb.label}
      </BreadcrumbPage>
    )
  }

  if (crumb.to) {
    return (
      <BreadcrumbLink asChild className="font-[450] hover:text-primary hover:underline underline-offset-3">
        <Link to={crumb.to}>
          {crumb.label}
        </Link>
      </BreadcrumbLink>
    )
  }

  return (
    <span>
      {crumb.label}
    </span>
  )
}

/** Topbar with a 62px minimum height, role breadcrumbs, menu button, and trailing content. */
function Topbar({
  crumbs,
  onMenuClick,
  trailing,
}: {
  crumbs: Crumb[]
  onMenuClick?: () => void
  trailing?: React.ReactNode
}) {
  const hasCrumbs = crumbs.length > 0

  return (
    <header className="flex h-auto min-h-topbar shrink-0 flex-wrap items-center gap-y-1 border-b border-border bg-card px-gutter-sm md:px-gutter">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="mr-3 inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card px-3 md:hidden"
        >
          <MenuIcon className="size-5" />
        </button>
      )}

      {hasCrumbs ? (
        <Breadcrumb className="min-w-0 flex-1 py-3">
          <BreadcrumbList className="min-w-0 flex-wrap gap-x-[9px] gap-y-1 text-[13.5px] text-muted-2 sm:gap-x-[9px] sm:gap-y-1">
            {crumbs.map((crumb, index) => {
              const current = index === crumbs.length - 1
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem className="min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]">
                    <BreadcrumbCrumb crumb={crumb} current={current} />
                  </BreadcrumbItem>
                  {!current && <BreadcrumbSeparator className="shrink-0 text-border" />}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center">{trailing}</div>
    </header>
  )
}

export { Topbar }
