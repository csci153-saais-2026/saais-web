
import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router"
import { DepartmentHeadLayout } from "@/routes/department-head/DepartmentHeadLayout"
import { PartnerPlaceholderPage } from "@/routes/department-head/PartnerPlaceholderPage"
import { PreviewStateProvider } from "@/routes/department-head/shared/PreviewStateProvider"

const StyleguidePage = lazy(() => import("@/routes/styleguide/StyleguidePage"))

const CurriculumTransfersPage = lazy(() => import("@/routes/department-head/CurriculumTransfersPage"))
const CurriculaPage = lazy(() => import("@/routes/department-head/CurriculaPage"))
const EquivalencePage = lazy(() => import("@/routes/department-head/EquivalencePage"))
const OutsideCreditsPage = lazy(() => import("@/routes/department-head/OutsideCreditsPage"))
const AcademicTermsPage = lazy(() => import("@/routes/department-head/AcademicTermsPage"))
const NotificationsPage = lazy(() => import("@/routes/department-head/NotificationsPage"))

const StudentsPage = lazy(() => import("@/routes/department-head/students/StudentsPage"))
const AdviserAssignmentsPage = lazy(() => import("@/routes/department-head/adviser-assignments/AdviserAssignmentsPage"))
const DepartmentReportsPage = lazy(() => import("@/routes/department-head/reports/DepartmentReportsPage"))
const AuditLogPage = lazy(() => import("@/routes/department-head/audit-log/AuditLogPage"))
const SettingsPage = lazy(() => import("@/routes/department-head/settings/SettingsPage"))

const LoginPage = lazy(() => import("@/routes/auth/LoginPage"))
const DocsHubPage = lazy(() => import("@/routes/docs/DocsHubPage"))
const OpenApiDocsPage = lazy(() => import("@/routes/docs/OpenApiDocsPage"))

function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">SAAIS</h1>
        <p className="text-muted-foreground mt-1">
          Student Academic Advising and Information System
        </p>
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
            <Link
              to="/styleguide"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              <span>Production Design System &amp; Style Guide →</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Tokens, components, and interactive examples.
            </p>
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
          <Route path="/department-head" element={<PreviewStateProvider><DepartmentHeadLayout /></PreviewStateProvider>}>
            <Route index element={<Navigate to="curriculum-transfers" replace />} />

            {/* Developer 1 Assigned Routes */}
            <Route path="curriculum-transfers" element={<CurriculumTransfersPage />} />
            <Route path="curricula" element={<CurriculaPage />} />
            <Route path="equivalence" element={<EquivalencePage />} />
            <Route path="outside-credits" element={<OutsideCreditsPage />} />
            <Route path="academic-terms" element={<AcademicTermsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            {/* Department Head management pages */}
            <Route path="students" element={<StudentsPage />} />
            <Route path="adviser-assignments" element={<AdviserAssignmentsPage />} />
            <Route path="reports" element={<DepartmentReportsPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="settings" element={<SettingsPage />} />

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

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Documentation */}
          <Route path="/docs" element={<DocsHubPage />} />
          <Route path="/docs/openapi" element={<OpenApiDocsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
