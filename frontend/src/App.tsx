import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LocaleProvider } from './contexts/LocaleContext'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Workspace = lazy(() => import('./pages/Workspace'))
const Login = lazy(() => import('./pages/Login'))
const AccountSettings = lazy(() => import('./pages/AccountSettings'))
const InvitationPage = lazy(() => import('./pages/InvitationPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LocaleProvider>
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-500">{localStorage.getItem('pibi.locale') === 'en' ? 'Loading...' : '불러오는 중...'}</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/invite/:inviteId" element={<InvitationPage />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/project/:id" element={<Workspace />} />
              <Route path="/settings" element={<AccountSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </AuthProvider>
        </LocaleProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">로그인 상태 확인 중...</div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}
