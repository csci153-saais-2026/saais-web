import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router'
import { SessionProvider } from './context/SessionContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { DevRoleSwitcher } from './components/DevRoleSwitcher'

const Login = lazy(() => import('./routes/auth/Login'))
const OAuthCallback = lazy(() =>
  import('./routes/auth/OAuthCallback').then((m) => ({ default: m.OAuthCallback }))
)

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8EF]">
      <div className="flex flex-col items-center gap-3 text-[#2F4A12]">
        <div className="w-8 h-8 border-3 border-[#2F4A12] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading SAAIS...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />

            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student" element={<Outlet />} />
              <Route path="/student/*" element={<Outlet />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['adviser']} />}>
              <Route path="/adviser" element={<Outlet />} />
              <Route path="/adviser/*" element={<Outlet />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<Outlet />} />
              <Route path="/admin/*" element={<Outlet />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>

        <DevRoleSwitcher />
      </SessionProvider>
    </BrowserRouter>
  )
}
