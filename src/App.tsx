import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router"
import { DepartmentHeadLayout } from "@/routes/department-head/DepartmentHeadLayout"
import { PartnerPlaceholderPage } from "@/routes/department-head/PartnerPlaceholderPage"

const StyleguidePage = lazy(() => import("@/routes/styleguide/StyleguidePage"))
const CurriculumTransfersPage = lazy(() => import("@/routes/department-head/CurriculumTransfersPage"))
const CurriculaPage = lazy(() => import("@/routes/department-head/CurriculaPage"))
const EquivalencePage = lazy(() => import("@/routes/department-head/EquivalencePage"))
const OutsideCreditsPage = lazy(() => import("@/routes/department-head/OutsideCreditsPage"))
const AcademicTermsPage = lazy(() => import("@/routes/department-head/AcademicTermsPage"))
const NotificationsPage = lazy(() => import("@/routes/department-head/NotificationsPage"))

function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">SAAIS</h1>
        <p className="text-muted-foreground mt-1">Student Academic Advising and Information System</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <h2 className="text-lg font-semibold mb-2">Available Portals & Modules</h2>
        <ul className="space-y-3">
          <li>
            <Link
              to="/department-head/curriculum-transfers"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              <span>Department Head Portal →</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Review transfers, curriculum versions, course equivalencies, outside credits, and academic terms.
            </p>
          </li>
          <li>
            <Link to="/styleguide" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
              <span>Production Design System &amp; Style Guide →</span>
            </Link>
            <p className="text-sm text-muted-foreground">Tokens, components, and interactive examples.</p>
          </li>
        </ul>
      </div>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/styleguide" element={<StyleguidePage />} />

          {/* Department Head Module */}
          <Route path="/department-head" element={<DepartmentHeadLayout />}>
            <Route index element={<Navigate to="curriculum-transfers" replace />} />
            
            {/* Developer 1 Assigned Routes */}
            <Route path="curriculum-transfers" element={<CurriculumTransfersPage />} />
            <Route path="curricula" element={<CurriculaPage />} />
            <Route path="equivalence" element={<EquivalencePage />} />
            <Route path="outside-credits" element={<OutsideCreditsPage />} />
            <Route path="academic-terms" element={<AcademicTermsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            {/* Developer 2 (Partner) Reserved Routes */}
            <Route
              path="students"
              element={
                <PartnerPlaceholderPage
                  title="Students"
                  subtitle="Find and review students across the Department of Computer Science and Technology."
                  screenNumber={6}
                />
              }
            />
            <Route
              path="adviser-assignments"
              element={
                <PartnerPlaceholderPage
                  title="Adviser assignments"
                  subtitle="Keep every student connected to an adviser in your department."
                  screenNumber={7}
                />
              }
            />
            <Route
              path="department-reports"
              element={
                <PartnerPlaceholderPage
                  title="Department reports"
                  subtitle="A semester snapshot of student progress across your department."
                  screenNumber={8}
                />
              }
            />
            <Route
              path="audit-log"
              element={
                <PartnerPlaceholderPage
                  title="Audit log"
                  subtitle="Review record views, changes, and sign-ins within your department."
                  screenNumber={9}
                />
              }
            />
            <Route
              path="settings"
              element={
                <PartnerPlaceholderPage
                  title="Settings"
                  subtitle="Configure department standing rules, email, and backup records."
                  screenNumber={10}
                />
              }
            />

            {/* Adviser sub-navigation placeholders */}
            <Route
              path="adviser/dashboard"
              element={
                <PartnerPlaceholderPage
                  title="Adviser Dashboard"
                  subtitle="Adviser workspace overview (Adviser role module)."
                  screenNumber={0}
                />
              }
            />
            <Route
              path="adviser/*"
              element={
                <PartnerPlaceholderPage
                  title="Adviser Workspace"
                  subtitle="Adviser view (Adviser role module)."
                  screenNumber={0}
                />
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
