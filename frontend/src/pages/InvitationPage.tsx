import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, LoaderCircle, Mail } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
import { productStore, type ProjectInvitation } from '../lib/productStore'

export default function InvitationPage() {
  const { inviteId = '' } = useParams()
  const { user, loading: authLoading, signOutUser } = useAuth()
  const { locale, t } = useLocale()
  const navigate = useNavigate()
  const [invitation, setInvitation] = useState<ProjectInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || !user) return
    let active = true
    setLoading(true)
    productStore.getInvitation(inviteId)
      .then((next) => { if (active) setInvitation(next) })
      .catch(() => { if (active) setError(t('invitationWrongAccount')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authLoading, user, inviteId, t])

  async function accept() {
    if (!user || !invitation) return
    setBusy(true)
    setError('')
    try {
      await productStore.acceptInvitation(invitation, user)
      navigate(`/project/${invitation.project_id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invitationExpired'))
    } finally {
      setBusy(false)
    }
  }

  const expired = !!invitation && invitation.expires_at.toMillis() < Date.now()
  const wrongAccount = !!user?.email && !!invitation?.email && user.email.toLowerCase() !== invitation.email.toLowerCase()

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Mail size={22} /></div>
        <h1 className="text-xl text-gray-900 mb-2">{t('inviteToProject')}</h1>
        {authLoading || (user && loading) ? <LoaderCircle className="mx-auto mt-6 animate-spin text-blue-600" /> : !user ? (
          <>
            <p className="mt-3 text-sm text-gray-600">{locale === 'ko' ? '초대 내용을 확인하려면 먼저 로그인해 주세요.' : 'Sign in to view this invitation.'}</p>
            <Link to="/login" state={{ from: `/invite/${inviteId}` }} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">{locale === 'ko' ? '로그인하고 계속' : 'Sign in to continue'}</Link>
          </>
        ) : !invitation ? (
          <p role="alert" className="mt-4 text-sm text-red-700">{error || t('invitationExpired')}</p>
        ) : wrongAccount ? (
          <div className="mt-4 space-y-4"><p role="alert" className="text-sm text-red-700">{t('invitationWrongAccount')}</p><p className="text-sm text-gray-500">{invitation.email}</p><button onClick={() => void signOutUser()} className="text-sm font-semibold text-blue-700">{t('signOut')}</button></div>
        ) : expired || invitation.status !== 'pending' ? (
          <>
            <p className="mt-4 text-sm text-gray-600">{invitation.status === 'accepted' && invitation.accepted_by === user.uid ? t('invitationAccepted') : t('invitationExpired')}</p>
            {invitation.status === 'accepted' && invitation.accepted_by === user.uid && <button onClick={() => navigate(`/project/${invitation.project_id}`)} className="mt-5 min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">{t('open')}</button>}
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-gray-600">{invitation.inviter_name} {locale === 'ko' ? '님이 다음 프로젝트에 초대했습니다.' : 'invited you to join'}</p>
            <p className="mt-2 text-lg text-gray-900">{invitation.project_name}</p>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button onClick={() => void accept()} disabled={busy} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{t('acceptInvite')}
            </button>
          </>
        )}
      </section>
    </main>
  )
}
