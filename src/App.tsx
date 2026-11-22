import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "@/context/AuthProvider";
import { DevRoleSwitcher } from "@/components/DevRoleSwitcher";
import { AuthenticatedPortalLayout } from "@/components/features/AuthenticatedPortalLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { DepartmentHeadLayout } from "@/routes/department-head/DepartmentHeadLayout";
import { NotFoundPage } from "@/routes/NotFoundPage";
import { QueryProvider } from "@/context/QueryProvider";

const LandingPage = lazy(() => import("@/routes/landing/LandingPage"));
const StyleguidePage = lazy(() => import("@/routes/styleguide/StyleguidePage"));
const LoginPage = lazy(() => import("@/routes/auth/LoginPage"));
const OAuthCallback = lazy(() => import("@/routes/auth/OAuthCallback"));
const InvitePage = lazy(() => import("@/routes/auth/InvitePage"));
const ForgotPasswordPage = lazy(
  () => import("@/routes/auth/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(() => import("@/routes/auth/ResetPasswordPage"));
const ChangePasswordPage = lazy(
  () => import("@/routes/auth/ChangePasswordPage"),
);
const DocsHubPage = lazy(() => import("@/routes/docs/DocsHubPage"));
const OpenApiDocsPage = lazy(() => import("@/routes/docs/OpenApiDocsPage"));

const StudentPortal = lazy(() => import("@/routes/student/StudentPortal"));
const AdviserPortal = lazy(() => import("@/routes/adviser/AdviserPortal"));
const CurriculumTransfersPage = lazy(
  () =>
    import("@/routes/department-head/curriculum-transfers/CurriculumTransfersPage"),
);
const CurriculaPage = lazy(
  () => import("@/routes/department-head/curricula/CurriculaPage"),
);
const EquivalencePage = lazy(
  () => import("@/routes/department-head/equivalence/EquivalencePage"),
);
const OutsideCreditsPage = lazy(
  () => import("@/routes/department-head/outside-credits/OutsideCreditsPage"),
);
const AcademicTermsPage = lazy(
  () => import("@/routes/department-head/academic-terms/AcademicTermsPage"),
);

const StudentsPage = lazy(
  () => import("@/routes/department-head/students/StudentsPage"),
);
const AdviserAssignmentsPage = lazy(
  () =>
    import("@/routes/department-head/adviser-assignments/AdviserAssignmentsPage"),
);
const DepartmentReportsPage = lazy(
  () => import("@/routes/department-head/reports/DepartmentReportsPage"),
);
const AuditLogPage = lazy(
  () => import("@/routes/department-head/audit-log/AuditLogPage"),
);
const SettingsPage = lazy(
  () => import("@/routes/department-head/settings/SettingsPage"),
);
const DepartmentStaffPortal = lazy(
  () => import("@/routes/department-staff/DepartmentStaffPortal"),
);
const DeanPortal = lazy(() => import("@/routes/dean/DeanPortal"));
const AdminRoutes = lazy(() => import("@/routes/admin/AdminRoutes"));
const NotificationsPage = lazy(
  () => import("@/routes/notifications/NotificationsPage"),
);

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense
            fallback={<div className="p-8 text-muted-foreground">Loading…</div>}
          >
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
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
                  <Route
                    path="/notifications"
                    element={<NotificationsPage />}
                  />
                  <Route path="/settings" element={<ChangePasswordPage />} />
                  <Route
                    path="/change-password"
                    element={<Navigate to="/settings" replace />}
                  />

                  <Route
                    element={<ProtectedRoute allowedRoles={["student"]} />}
                  >
                    <Route path="/student/*" element={<StudentPortal />} />
                  </Route>

                  <Route
                    element={<ProtectedRoute allowedRoles={["adviser"]} />}
                  >
                    <Route path="/adviser/*" element={<AdviserPortal />} />
                  </Route>

                  <Route
                    element={
                      <ProtectedRoute allowedRoles={["department_staff"]} />
                    }
                  >
                    <Route
                      path="/department-staff/*"
                      element={<DepartmentStaffPortal />}
                    />
                    <Route
                      path="/staff/*"
                      element={<Navigate to="/department-staff" replace />}
                    />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["dean"]} />}>
                    <Route path="/dean/*" element={<DeanPortal />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                    <Route path="/admin/*" element={<AdminRoutes />} />
                  </Route>
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={["department_head"]} />
                    }
                  >
                    <Route
                      path="/department-head"
                      element={<DepartmentHeadLayout />}
                    >
                      <Route
                        index
                        element={<Navigate to="curriculum-transfers" replace />}
                      />
                      <Route
                        path="transfers"
                        element={
                          <Navigate to="../curriculum-transfers" replace />
                        }
                      />
                      <Route
                        path="curriculum-transfers"
                        element={<CurriculumTransfersPage />}
                      />
                      <Route path="curricula" element={<CurriculaPage />} />
                      <Route path="equivalence" element={<EquivalencePage />} />
                      <Route
                        path="outside-credits"
                        element={<OutsideCreditsPage />}
                      />
                      <Route
                        path="academic-terms"
                        element={<AcademicTermsPage />}
                      />
                      <Route
                        path="notifications"
                        element={<NotificationsPage />}
                      />
                      <Route path="students" element={<StudentsPage />} />
                      <Route
                        path="adviser-assignments"
                        element={<AdviserAssignmentsPage />}
                      />
                      <Route
                        path="reports"
                        element={<DepartmentReportsPage />}
                      />
                      <Route path="audit-log" element={<AuditLogPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                    <Route
                      path="/dept-head/*"
                      element={<Navigate to="/department-head" replace />}
                    />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <DevRoleSwitcher />
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
