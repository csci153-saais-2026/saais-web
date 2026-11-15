import * as React from "react"
import { EllipsisIcon, MenuIcon } from "@/components/icons"
import { Link } from "react-router"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export type Crumb = { label: string; to?: string }

function PreviousPagesMenu({ crumbs }: { crumbs: Crumb[] }) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Show previous pages"
          className="inline-flex size-10 items-center justify-center rounded-lg text-muted-2 hover:bg-background hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <EllipsisIcon className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-w-[calc(100vw-2rem)] gap-0 p-0"
      >
        <nav aria-label="Previous pages">
          <ol className="max-h-64 overflow-y-auto py-1">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`}>
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-background focus-visible:bg-background"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="block px-4 py-2 text-sm text-muted-foreground">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </PopoverContent>
    </Popover>
  )
}

function BreadcrumbCrumb({
  crumb,
  current = false,
}: {
  crumb: Crumb
  current?: boolean
}) {
  if (current) {
    return (
      <BreadcrumbPage className="block min-w-0 max-w-full truncate font-semibold">
        {crumb.label}
      </BreadcrumbPage>
    )
  }

  if (crumb.to) {
    return (
      <BreadcrumbLink asChild className="min-w-0 max-w-[12rem] truncate lg:max-w-[20rem]">
        <Link to={crumb.to} className="block min-w-0 truncate">
          {crumb.label}
        </Link>
      </BreadcrumbLink>
    )
  }

  return (
    <span className="block min-w-0 max-w-[12rem] truncate text-muted-foreground lg:max-w-[20rem]">
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
        <Breadcrumb className="min-w-32 flex-1">
          <BreadcrumbList className="min-w-0 flex-nowrap whitespace-nowrap md:hidden">
            {crumbs.length > 1 && (
              <>
                <BreadcrumbItem className="shrink-0">
                  <PreviousPagesMenu crumbs={crumbs.slice(0, -1)} />
                </BreadcrumbItem>
                <BreadcrumbSeparator className="shrink-0" />
              </>
            )}
            <BreadcrumbItem className="min-w-0 flex-1">
              <BreadcrumbCrumb crumb={crumbs[crumbs.length - 1]} current />
            </BreadcrumbItem>
          </BreadcrumbList>

          <BreadcrumbList className="hidden min-w-0 flex-nowrap whitespace-nowrap md:flex">
            {crumbs.length > 2 && (
              <>
                <BreadcrumbItem className="shrink-0">
                  <PreviousPagesMenu crumbs={crumbs.slice(0, -2)} />
                </BreadcrumbItem>
                <BreadcrumbSeparator className="shrink-0" />
              </>
            )}
            {crumbs.slice(-2).map((crumb, index) => {
              const actualIndex = Math.max(0, crumbs.length - 2) + index
              const current = actualIndex === crumbs.length - 1
              return (
                <React.Fragment key={`${crumb.label}-${actualIndex}`}>
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbCrumb crumb={crumb} current={current} />
                  </BreadcrumbItem>
                  {!current && <BreadcrumbSeparator className="shrink-0" />}
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
