import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/context/AuthProvider'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'
import { AuthenticatedPortalLayout } from '@/components/features/AuthenticatedPortalLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

const StyleguidePage = lazy(() => import('@/routes/styleguide/StyleguidePage'))
const LoginPage = lazy(() => import('@/routes/auth/LoginPage'))
const OAuthCallback = lazy(() => import('@/routes/auth/OAuthCallback'))
const InvitePage = lazy(() => import('@/routes/auth/InvitePage'))
const ForgotPasswordPage = lazy(() => import('@/routes/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/routes/auth/ResetPasswordPage'))
const ChangePasswordPage = lazy(() => import('@/routes/auth/ChangePasswordPage'))
const DocsHubPage = lazy(() => import('@/routes/docs/DocsHubPage'))
const OpenApiDocsPage = lazy(() => import('@/routes/docs/OpenApiDocsPage'))

const StudentPortal = lazy(() => import('@/routes/student/StudentPortal'))
const AdviserPortal = lazy(() => import('@/routes/adviser/AdviserPortal'))
const DepartmentHeadPortal = lazy(
  () => import('@/routes/department-head/DepartmentHeadPortal'),
)
const DepartmentStaffPortal = lazy(
  () => import('@/routes/department-staff/DepartmentStaffPortal'),
)
const DeanPortal = lazy(() => import('@/routes/dean/DeanPortal'))
const AdminPortal = lazy(() => import('@/routes/admin/AdminPortal'))

function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">SAAIS</h1>
      <p className="text-muted-foreground mt-2">
        Student Academic Advising Information System.
      </p>
      <div className="flex gap-4 mt-6">
        <a
          href="/login"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
        >
          Sign In
        </a>
        <a href="/docs" className="px-4 py-2 border rounded-md text-sm font-medium">
          API Documentation
        </a>
        <a href="/styleguide" className="px-4 py-2 border rounded-md text-sm font-medium">
          Styleguide
        </a>
      </div>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/styleguide" element={<StyleguidePage />} />
            <Route path="/docs" element={<DocsHubPage />} />
            <Route path="/docs/openapi" element={<OpenApiDocsPage />} />

            {/* Authenticated shell wrapping all protected portals and settings */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthenticatedPortalLayout />}>
                <Route path="/settings" element={<ChangePasswordPage />} />
                <Route path="/change-password" element={<Navigate to="/settings" replace />} />

                <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                  <Route path="/student/*" element={<StudentPortal />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['adviser']} />}>
                  <Route path="/adviser/*" element={<AdviserPortal />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['department_head']} />}>
                  <Route path="/department-head/*" element={<DepartmentHeadPortal />} />
                  <Route path="/dept-head/*" element={<Navigate to="/department-head" replace />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['department_staff']} />}>
                  <Route path="/department-staff/*" element={<DepartmentStaffPortal />} />
                  <Route path="/staff/*" element={<Navigate to="/department-staff" replace />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['dean']} />}>
                  <Route path="/dean/*" element={<DeanPortal />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admin/*" element={<AdminPortal />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
        <DevRoleSwitcher />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
