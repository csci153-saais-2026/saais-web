import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router"

const DeanReportsPage = lazy(() => import("@/routes/dean/pages/DeanReportsPage"))
const DeanStudentsPage = lazy(() => import("@/routes/dean/pages/DeanStudentsPage"))
const DeanAuditLogPage = lazy(() => import("@/routes/dean/pages/DeanAuditLogPage"))

export default function DeanPortal() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading…</div>}>
      <Routes>
        <Route index element={<Navigate to="reports" replace />} />
        <Route path="reports" element={<DeanReportsPage />} />
        <Route path="students" element={<DeanStudentsPage />} />
        <Route path="students/*" element={<Navigate to="/dean/students" replace />} />
        <Route path="audit-log" element={<DeanAuditLogPage />} />
        <Route path="*" element={<Navigate to="reports" replace />} />
      </Routes>
    </Suspense>
  )
}
