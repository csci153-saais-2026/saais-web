import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "@/hooks/use-auth";

const StudentDashboardPage = lazy(
  () => import("./dashboard/StudentDashboardPage"),
);
const StudentChecklistPage = lazy(
  () => import("./checklist/StudentChecklistPage"),
);
const StudentGradesPage = lazy(() => import("./grades/StudentGradesPage"));
const StudentEnrollmentHistoryPage = lazy(
  () => import("./enrollment-history/StudentEnrollmentHistoryPage"),
);
const StudentProfilePage = lazy(() => import("./profile/StudentProfilePage"));

export default function StudentPortal() {
  const { user } = useAuth();

  if (!user?.id) {
    return null;
  }

  return (
    <Suspense
      fallback={<div className="p-8 text-muted-foreground">Loading…</div>}
    >
      <Routes>
        <Route index element={<StudentDashboardPage studentId={user.id} />} />
        <Route
          path="dashboard"
          element={<StudentDashboardPage studentId={user.id} />}
        />
        <Route
          path="checklist"
          element={<StudentChecklistPage studentId={user.id} />}
        />
        <Route
          path="grades"
          element={<StudentGradesPage studentId={user.id} />}
        />
        <Route
          path="enrollment-history"
          element={<StudentEnrollmentHistoryPage studentId={user.id} />}
        />
        <Route
          path="history"
          element={<Navigate to="/student/enrollment-history" replace />}
        />
        <Route
          path="profile"
          element={<StudentProfilePage studentId={user.id} />}
        />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </Suspense>
  );
}
