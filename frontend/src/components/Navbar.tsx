import { useNavigate, useLocation } from 'react-router-dom'
import { Globe, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export default function Navbar({ projectId }: { projectId?: string }) {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className="h-[72px] bg-white border-b border-gray-200 px-5 lg:px-10 flex items-center justify-center flex-shrink-0 z-30 select-none">
      <div className="w-full max-w-[1320px] flex items-center justify-between">
      {/* Left: Brand + Navigation Tabs */}
      <div className="flex items-center gap-6">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-[12px] bg-blue-50 text-blue-700 flex items-center justify-center text-sm transition-colors">
            🌱
          </div>
          <span className="font-extrabold text-gray-900 text-sm tracking-tight">pibi</span>
        </div>

        {/* Global Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              isHome
                ? 'bg-gray-100 text-gray-900 font-bold'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            홈
          </button>
          <button
            onClick={() => {
              if (projectId) navigate(`/project/${projectId}`)
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              !isHome
                ? 'bg-gray-100 text-gray-900 font-bold'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            작업 공간
          </button>
        </div>
      </div>

      {/* Right: Version, Lang, Notification, Profile */}
      <div className="flex items-center gap-3 sm:gap-4 text-xs">
        <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
          pibi desktop v0.2.14
        </span>

        <button className="text-gray-400 hover:text-gray-700 transition-colors p-1" title="언어 설정">
          <Globe size={15} />
        </button>

        <div className="relative cursor-pointer p-1">
          <Bell size={15} className="text-gray-600 hover:text-gray-900 transition-colors" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
            3
          </span>
        </div>

        {/* User profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
            {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-gray-800 max-w-36 truncate" title={user?.email ?? ''}>
            {user?.displayName || user?.email}
          </span>
          <button onClick={() => void signOutUser()} title="로그아웃" aria-label="로그아웃" className="p-1 text-gray-400 hover:text-red-600">
            <LogOut size={14} />
          </button>
        </div>
      </div>
      </div>
    </header>
  )
}
