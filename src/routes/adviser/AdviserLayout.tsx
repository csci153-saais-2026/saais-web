import { Suspense } from "react"
import { Link, matchPath, Outlet, useLocation } from "react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { adviserNav } from "@/navigation/adviser"

/** Adviser content inside the host shell; keep its viewport and gutter ownership intact. */
export function AdviserLayout() {
  const { pathname } = useLocation()
  const isStudentRecord = !!matchPath("/adviser/advisee/:id/*", pathname)
  const currentItem = adviserNav.items.find(item => matchPath({ path: item.href, end: true }, pathname))
  const parentItem = isStudentRecord
    ? adviserNav.items.find(item => item.href === "/adviser/advisees")
    : undefined
  const item = currentItem ?? parentItem
  const homeHref = adviserNav.items.find(item => item.href === "/adviser/dashboard")?.href ?? "/adviser"

  return (
    <div className="min-w-0 w-full [overflow-wrap:anywhere]">
      <header className="mb-6">
        <Breadcrumb aria-label="Adviser navigation">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to={homeHref}>{adviserNav.title}</Link></BreadcrumbLink>
            </BreadcrumbItem>
            {item && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {currentItem
                    ? <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    : <BreadcrumbLink asChild><Link to={item.href}>{item.label}</Link></BreadcrumbLink>}
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <Suspense fallback={<p role="status" className="text-muted-foreground">Loading adviser page…</p>}>
        <Outlet />
      </Suspense>
    </div>
  )
}
