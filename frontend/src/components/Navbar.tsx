import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, Globe, LogOut, Settings, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
import { useProductProfile } from '../hooks/useProductProfile'
import { productStore, type ProjectInvitation } from '../lib/productStore'

export default function Navbar({ projectId }: { projectId?: string }) {
  const { user, signOutUser } = useAuth()
  const { locale, setLocale, t } = useLocale()
  const profile = useProductProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([])
  const [openMenu, setOpenMenu] = useState<'notifications' | 'account' | 'language' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.email) { setInvitations([]); return }
    return productStore.subscribeInvitations(user.uid, user.email, setInvitations)
  }, [user])

  useEffect(() => {
    if (!user?.email || !profile?.browserNotifications || !('Notification' in window) || Notification.permission !== 'granted') return
    const seenIds = new Set<string>()
    let initialized = false
    return productStore.subscribeInvitations(user.uid, user.email, (items) => {
      const incoming = items.filter((item) => item.email.toLowerCase() === user.email!.toLowerCase() && item.status === 'pending')
      if (initialized) {
        incoming.filter((item) => !seenIds.has(item.id)).forEach((item) => {
          new Notification(item.project_name, { body: `${item.inviter_name} ${locale === 'ko' ? '님이 초대했습니다.' : 'invited you to join.'}` })
        })
      }
      initialized = true
      incoming.forEach((item) => seenIds.add(item.id))
    })
  }, [user, profile?.browserNotifications, locale])

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', closeMenus)
    return () => document.removeEventListener('mousedown', closeMenus)
  }, [])

  const inbox = invitations.filter((item) =>
    (item.email.toLowerCase() === user?.email?.toLowerCase() && item.status === 'pending') ||
    (item.inviter_uid === user?.uid && item.status === 'accepted')
  )
  const unreadCount = invitations.filter((item) =>
    item.email.toLowerCase() === user?.email?.toLowerCase() && item.status === 'pending' && !item.read_at
  ).length

  async function changeLocale(next: 'ko' | 'en') {
    setLocale(next)
    setOpenMenu(null)
    if (user) {
      await productStore.updateProfile(user.uid, {
        displayName: user.displayName || user.email?.split('@')[0] || '',
        locale: next,
        browserNotifications: profile?.browserNotifications === true,
      }).catch((error) => console.error('Failed to save language setting:', error))
    }
  }

  async function openInvitation(invitation: ProjectInvitation) {
    setOpenMenu(null)
    if (invitation.email.toLowerCase() === user?.email?.toLowerCase() && invitation.status === 'pending') {
      await productStore.markInvitationRead(invitation.id).catch(() => undefined)
      navigate(`/invite/${invitation.id}`)
    } else {
      navigate(`/project/${invitation.project_id}`)
    }
  }

  return (
    <header className="h-[72px] bg-white border-b border-gray-200 px-4 sm:px-5 lg:px-10 flex items-center justify-center flex-shrink-0 z-30">
      <div className="w-full max-w-[1320px] flex items-center justify-between gap-3" ref={menuRef}>
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0" aria-label="pibi home">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-sm">🌱</span>
            <span className="font-display text-gray-900 text-sm tracking-tight">pibi</span>
          </button>
          <nav className="flex items-center gap-1">
            <button onClick={() => navigate('/')} className={`px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold ${isHome ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}>{t('home')}</button>
            <button onClick={() => projectId && navigate(`/project/${projectId}`)} disabled={!projectId} className={`hidden sm:block px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 ${!isHome ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}>{t('workspace')}</button>
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === 'language' ? null : 'language')} aria-label={t('language')} title={t('language')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-50"><Globe size={17} /></button>
            {openMenu === 'language' && <div className="absolute right-0 top-11 z-50 w-36 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
              {(['ko', 'en'] as const).map((option) => <button key={option} onClick={() => void changeLocale(option)} className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 ${locale === option ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>{option === 'ko' ? '한국어' : 'English'}</button>)}
            </div>}
          </div>

          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')} aria-label={t('notifications')} className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-50"><Bell size={17} />
              {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {openMenu === 'notifications' && <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
              <div className="px-3 py-2 text-sm font-semibold text-gray-900">{t('notifications')}</div>
              {inbox.length === 0 ? <p className="px-3 py-5 text-center text-sm text-gray-500">{t('noNotifications')}</p> : <div className="max-h-80 overflow-y-auto">
                {inbox.map((item) => {
                  const incoming = item.email.toLowerCase() === user?.email?.toLowerCase()
                  return <button key={item.id} onClick={() => void openInvitation(item)} className="w-full rounded-xl px-3 py-3 text-left hover:bg-gray-50">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900"><Users size={15} className="text-blue-600" />{incoming ? (locale === 'ko' ? '프로젝트 초대' : 'Project invitation') : (locale === 'ko' ? '초대 수락됨' : 'Invitation accepted')}</span>
                    <span className="mt-1 block truncate pl-6 text-xs text-gray-600">{incoming ? `${item.inviter_name} · ${item.project_name}` : `${item.email} · ${item.project_name}`}</span>
                  </button>
                })}
              </div>}
            </div>}
          </div>

          <div className="relative ml-1 border-l border-gray-200 pl-2">
            <button onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-gray-50" aria-label={t('settings')}>
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-semibold flex items-center justify-center text-xs">{(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}</span>
              <span className="hidden md:block max-w-36 truncate text-xs font-semibold text-gray-800">{user?.displayName || user?.email}</span>
            </button>
            {openMenu === 'account' && <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
              <button onClick={() => { setOpenMenu(null); navigate('/settings') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"><Settings size={15} />{t('settings')}</button>
              <button onClick={() => void signOutUser()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"><LogOut size={15} />{t('signOut')}</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  )
}
