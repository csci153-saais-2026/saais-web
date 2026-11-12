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

/** 62px white bar: mobile menu button, breadcrumb trail, notification slot on the right. */
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
    <header className="flex h-topbar shrink-0 items-center border-b border-border bg-card px-gutter-sm md:px-gutter">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="mr-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-3 md:hidden"
        >
          <MenuIcon className="size-5" />
        </button>
      )}

      {hasCrumbs ? (
        <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
          <BreadcrumbList className="min-w-0 overflow-hidden">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1
              return (
                <React.Fragment key={`${c.label}-${i}`}>
                  <BreadcrumbItem className="min-w-0">
                    {last || !c.to ? (
                      <BreadcrumbPage className="max-w-[12rem] truncate font-semibold sm:max-w-[20rem]">
                        {c.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        asChild
                        className="max-w-[12rem] truncate sm:max-w-[20rem]"
                      >
                        <Link to={c.to} className="block truncate">
                          {c.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!last && <BreadcrumbSeparator className="shrink-0" />}
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
