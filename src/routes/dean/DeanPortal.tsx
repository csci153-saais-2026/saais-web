import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { NotFoundPage } from "@/routes/NotFoundPage";

const DeanReportsPage = lazy(
  () => import("@/routes/dean/reports/DeanReportsPage"),
);
const DeanStudentsPage = lazy(
  () => import("@/routes/dean/students/DeanStudentsPage"),
);
const DeanAuditLogPage = lazy(
  () => import("@/routes/dean/audit-log/DeanAuditLogPage"),
);

export default function DeanPortal() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <Routes>
        <Route index element={<Navigate to="reports" replace />} />
        <Route path="reports" element={<DeanReportsPage />} />
        <Route path="students" element={<DeanStudentsPage />} />
        <Route
          path="students/*"
          element={<Navigate to="/dean/students" replace />}
        />
        <Route path="audit-log" element={<DeanAuditLogPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
