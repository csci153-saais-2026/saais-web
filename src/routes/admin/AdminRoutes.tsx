import { PageSkeleton } from "@/components/features/loading-skeletons";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import AdminPortal from "./shared/AdminPortal";

const AdminStudentsPage = lazy(() => import("./students/AdminStudentsPage"));
const AdminAccountsPage = lazy(() => import("./accounts/AdminAccountsPage"));
const AdminProgramsPage = lazy(() => import("./programs/AdminProgramsPage"));
const AdminFacultiesPage = lazy(() => import("./faculties/AdminFacultiesPage"));
const AdminSettingsPage = lazy(() => import("./settings/AdminSettingsPage"));
const AdminAuditLogPage = lazy(() => import("./audit-log/AdminAuditLogPage"));

export default function AdminRoutes() {
  return (
    <Suspense fallback={<PageSkeleton label="Loading…" />}>
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
  );
}
