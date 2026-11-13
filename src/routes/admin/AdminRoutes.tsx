import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AdminPortal from './AdminPortal'

const AdminStudentsPage = lazy(() => import('./AdminStudentsPage'))
const AdminAccountsPage = lazy(() => import('./AdminAccountsPage'))
const AdminProgramsPage = lazy(() => import('./AdminProgramsPage'))
const AdminFacultiesPage = lazy(() => import('./AdminFacultiesPage'))
const AdminSettingsPage = lazy(() => import('./AdminSettingsPage'))
const AdminAuditLogPage = lazy(() => import('./AdminAuditLogPage'))

export default function AdminRoutes() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <Routes>
        <Route index element={<AdminPortal />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="programs" element={<AdminProgramsPage />} />
        <Route path="faculties" element={<AdminFacultiesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="audit-log" element={<AdminAuditLogPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  )
}
