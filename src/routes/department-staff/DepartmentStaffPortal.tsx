import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Panel } from "@/components/features/panel";
import { StaffScopeProvider } from "./shared/staff-scope-provider";
import { useStaffScope } from "./shared/use-staff-scope";

const StudentsPage = lazy(() => import("./students/StudentsPage"));
const AdviserAssignmentsPage = lazy(
  () => import("./adviser-assignments/AdviserAssignmentsPage"),
);
const AcademicTermsPage = lazy(
  () => import("./academic-terms/AcademicTermsPage"),
);
const CurriculaPage = lazy(() => import("./curricula/CurriculaPage"));
const CourseCatalogPage = lazy(
  () => import("./course-catalog/CourseCatalogPage"),
);
const AccountsPage = lazy(() => import("./accounts/AccountsPage"));

function DepartmentStaffContent() {
  const scope = useStaffScope();
  const location = useLocation();
  const isPortalIndex =
    location.pathname === "/department-staff" ||
    location.pathname === "/department-staff/";

  return (
    <div className="space-y-6">
      {scope.status !== "ready" ? (
        <Panel
          title="Department Staff Operations"
          description="Department student records, term encoding closures, and adviser assignments."
        >
          <div className="border rounded-md bg-muted/20 p-6 text-sm text-muted-foreground">
            {scope.status === "loading" && (
              <p role="status">Loading your authorized department scope…</p>
            )}
            {scope.status === "clearing" && (
              <p role="status">Switching department scope…</p>
            )}
            {scope.status === "unavailable" && (
              <p role="alert">
                {scope.reason === "unauthenticated"
                  ? "Sign in to access Department Staff operations."
                  : scope.reason === "role-not-assigned"
                    ? "A Department Staff role assignment is required to continue."
                    : "No department scope is assigned to your Department Staff role."}
              </p>
            )}
            {scope.status === "select-department" && (
              <label className="flex max-w-md flex-col gap-2 text-foreground">
                Choose an authorized department
                <select
                  value={scope.selectedDepartmentId ?? ""}
                  onChange={(event) =>
                    scope.selectDepartment(event.target.value)
                  }
                  className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="" disabled>
                    Select a department
                  </option>
                  {scope.departmentIds.map((departmentId) => (
                    <option key={departmentId} value={departmentId}>
                      Department {departmentId}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            {scope.departmentIds.length > 1 && (
              <label className="flex max-w-md flex-col gap-2 text-sm text-foreground">
                Active department
                <select
                  value={scope.selectedDepartmentId}
                  onChange={(event) =>
                    scope.selectDepartment(event.target.value)
                  }
                  className="min-h-11 rounded-md border border-input bg-background px-3"
                >
                  {scope.departmentIds.map((departmentId) => (
                    <option key={departmentId} value={departmentId}>
                      Department {departmentId}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <Suspense
            fallback={<p role="status">Loading Department Staff page…</p>}
          >
            {isPortalIndex ? (
              <Navigate to="/department-staff/students" replace />
            ) : (
              <Routes>
                <Route path="students" element={<StudentsPage />} />
                <Route
                  path="adviser-assignments"
                  element={<AdviserAssignmentsPage />}
                />
                <Route path="academic-terms" element={<AcademicTermsPage />} />
                <Route path="curricula" element={<CurriculaPage />} />
                <Route path="course-catalog" element={<CourseCatalogPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route
                  path="*"
                  element={
                    <Panel title="Page not found">
                      <p role="alert">
                        This Department Staff page does not exist.
                      </p>
                    </Panel>
                  }
                />
              </Routes>
            )}
          </Suspense>
        </>
      )}
    </div>
  );
}

export default function DepartmentStaffPortal() {
  return (
    <StaffScopeProvider>
      <DepartmentStaffContent />
    </StaffScopeProvider>
  );
}
