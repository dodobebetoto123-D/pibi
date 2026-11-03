import { useEffect, useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth'
import { LockKeyhole, Save, UserRound } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
import { useProductProfile } from '../hooks/useProductProfile'
import { productStore } from '../lib/productStore'

export default function AccountSettings() {
  const { user } = useAuth()
  const profile = useProductProfile()
  const { locale, setLocale, t } = useLocale()
  const [displayName, setDisplayName] = useState('')
  const [browserNotifications, setBrowserNotifications] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.displayName ?? user?.displayName ?? '')
    setBrowserNotifications(profile?.browserNotifications === true)
  }, [profile, user])

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!user || !displayName.trim()) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await updateProfile(user, { displayName: displayName.trim() })
      await productStore.updateProfile(user.uid, {
        displayName: displayName.trim(), locale, browserNotifications,
      })
      setMessage(t('saved'))
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleBrowserNotifications(enabled: boolean) {
    setError('')
    if (enabled && !('Notification' in window)) {
      setError(locale === 'ko' ? '이 브라우저는 알림을 지원하지 않습니다.' : 'This browser does not support notifications.')
      return
    }
    if (enabled && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError(locale === 'ko' ? '브라우저 알림 권한을 허용해야 켤 수 있습니다.' : 'Allow browser notifications to enable this setting.')
        return
      }
    }
    setBrowserNotifications(enabled)
    if (user) {
      try {
        await productStore.updateProfile(user.uid, {
          displayName: displayName.trim() || user.displayName || '', locale, browserNotifications: enabled,
        })
      } catch (err) {
        setBrowserNotifications(!enabled)
        setError(err instanceof Error ? err.message : '설정을 저장하지 못했습니다.')
      }
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    if (!user || !newPassword) return
    setError('')
    setMessage('')
    if (newPassword.length < 6) {
      setError(locale === 'ko' ? '새 비밀번호는 6자 이상이어야 합니다.' : 'Use at least 6 characters for the new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError(locale === 'ko' ? '새 비밀번호가 서로 다릅니다.' : 'The new passwords do not match.')
      return
    }
    if (user.providerData.some((provider) => provider.providerId === 'password') && !currentPassword) {
      setError(locale === 'ko' ? '현재 비밀번호를 입력해 주세요.' : 'Enter your current password.')
      return
    }
    setBusy(true)
    try {
      if (user.email && currentPassword && user.providerData.some((provider) => provider.providerId === 'password')) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword)
        await reauthenticateWithCredential(user, credential)
      }
      await updatePassword(user, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage(locale === 'ko' ? '비밀번호를 변경했습니다.' : 'Password updated.')
    } catch (err) {
      const code = (err as { code?: string })?.code
      setError(code === 'auth/requires-recent-login'
        ? (locale === 'ko' ? '보안을 위해 다시 로그인한 뒤 시도해 주세요.' : 'Sign in again before changing your password.')
        : err instanceof Error ? err.message : '비밀번호를 변경하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="w-full max-w-3xl mx-auto px-5 py-8 sm:py-12">
        <h1 className="text-2xl text-gray-900 mb-2">{t('settings')}</h1>
        <p className="text-sm text-gray-500 mb-8">{locale === 'ko' ? '계정 정보와 앱 사용 환경을 관리합니다.' : 'Manage your account and app preferences.'}</p>

        <form onSubmit={saveProfile} className="rounded-2xl border border-gray-200 p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 text-gray-900"><UserRound size={18} /><h2 className="text-lg">{t('account')}</h2></div>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">{t('displayName')}</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={80} className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </label>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">{t('email')}</span>
            <div className="h-11 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">{user?.email}</div>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">{t('language')}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as 'ko' | 'en')} className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm">
              <option value="ko">한국어</option><option value="en">English</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4">
            <span><span className="block text-sm font-medium text-gray-800">{t('browserNotifications')}</span><span className="block mt-1 text-xs text-gray-500">{locale === 'ko' ? '새 초대가 도착하면 브라우저 알림을 표시합니다.' : 'Show a browser notification when a new invitation arrives.'}</span></span>
            <input type="checkbox" checked={browserNotifications} onChange={(event) => void toggleBrowserNotifications(event.target.checked)} className="h-4 w-4 accent-blue-600" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          <button disabled={busy || !displayName.trim()} className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Save size={16} />{t('save')}</button>
        </form>

        <form onSubmit={changePassword} className="mt-6 rounded-2xl border border-gray-200 p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-gray-900"><LockKeyhole size={18} /><h2 className="text-lg">{t('password')}</h2></div>
          {user?.providerData.some((provider) => provider.providerId === 'password') && <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder={t('currentPassword')} className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />}
          <input type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t('newPassword')} className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
          <input type="password" autoComplete="new-password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t('confirmPassword')} className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
          <button disabled={busy || !newPassword} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">{t('updatePassword')}</button>
        </form>
      </main>
    </div>
  )
}
