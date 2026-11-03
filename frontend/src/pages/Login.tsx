import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Leaf, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { firebaseConfigured } from '../auth/firebase'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../contexts/LocaleContext'

type Mode = 'login' | 'signup' | 'reset'

function readableAuthError(error: unknown) {
  const code = (error as { code?: string })?.code
  const messages: Record<string, string> = {
    'auth/invalid-credential': '이메일 또는 비밀번호를 확인해주세요.',
    'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요.',
    'auth/weak-password': '비밀번호는 6자 이상으로 설정해주세요.',
    'auth/invalid-email': '이메일 주소 형식을 확인해주세요.',
    'auth/too-many-requests': '요청이 많습니다. 잠시 후 다시 시도해주세요.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
    'auth/user-not-found': '등록된 계정을 찾을 수 없습니다.',
    'auth/popup-closed-by-user': 'Google 로그인이 취소되었습니다.',
    'auth/popup-blocked': '브라우저가 로그인 창을 차단했습니다. 팝업을 허용하고 다시 시도해주세요.',
    'auth/account-exists-with-different-credential': '이 이메일은 다른 로그인 방법으로 이미 가입되어 있습니다. 기존 방법으로 로그인해주세요.',
  }
  return messages[code ?? ''] ?? (error instanceof Error ? error.message : '요청을 완료하지 못했습니다.')
}

export default function Login() {
  const { signIn, signInWithGoogle, signUp, resetPassword } = useAuth()
  const { locale, setLocale } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'signup' && password !== confirmPassword) {
      setError('비밀번호가 서로 다릅니다.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') await signUp(email.trim(), password)
      else if (mode === 'reset') {
        await resetPassword(email.trim())
        setNotice('비밀번호 재설정 이메일을 보냈습니다.')
        setMode('login')
        return
      } else await signIn(email.trim(), password)
      navigate((location.state as { from?: string } | null)?.from || '/', { replace: true })
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function continueWithGoogle() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await signInWithGoogle()
      navigate((location.state as { from?: string } | null)?.from || '/', { replace: true })
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  const title = locale === 'ko'
    ? mode === 'signup' ? '계정 만들기' : mode === 'reset' ? '비밀번호 재설정' : '다시 오셨네요'
    : mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-5 py-10 relative">
      <button onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')} className="absolute right-5 top-5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">{locale === 'ko' ? 'English' : '한국어'}</button>
      <section className="w-full max-w-md bg-white rounded-[16px] border border-gray-200 p-8 sm:p-10">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-[16px] bg-blue-50 text-blue-600 flex items-center justify-center">
            <Leaf size={24} />
          </div>
        </div>
        <div className="text-center mb-8">
          <p className="font-extrabold text-gray-900 tracking-tight">pibi</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-4">{title}</h1>
          <p className="text-sm text-gray-500 mt-2">
            {locale === 'ko'
              ? mode === 'signup' ? '이메일로 가입하고 아이디어를 프로젝트로 만들어보세요.' : mode === 'reset' ? '가입한 이메일 주소를 입력해주세요.' : '로그인해 프로젝트 작업을 이어가세요.'
              : mode === 'signup' ? 'Sign up with email and turn an idea into a project.' : mode === 'reset' ? 'Enter the email address on your account.' : 'Sign in to continue your projects.'}
          </p>
        </div>

        {!firebaseConfigured ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 leading-6">
            Firebase 웹 앱 설정이 아직 없습니다. `frontend/.env.example`을 복사해 `frontend/.env.local`을 만들고 Firebase 웹 앱 값을 입력한 뒤 개발 서버를 다시 시작해주세요.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-700">{locale === 'ko' ? '이메일' : 'Email'}</span>
              <span className="mt-1.5 min-h-12 flex items-center gap-2 rounded-[12px] border border-gray-300 px-3.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200">
                <Mail size={16} className="text-gray-400" />
                <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full py-3 text-sm outline-none" />
              </span>
            </label>
            {mode !== 'reset' && <label className="block">
              <span className="text-xs font-bold text-gray-700">{locale === 'ko' ? '비밀번호' : 'Password'}</span>
              <span className="mt-1.5 min-h-12 flex items-center gap-2 rounded-[12px] border border-gray-300 px-3.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200">
                <LockKeyhole size={16} className="text-gray-400" />
                <input required minLength={6} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" className="w-full py-3 text-sm outline-none" />
              </span>
            </label>}
            {mode === 'signup' && <label className="block">
              <span className="text-xs font-bold text-gray-700">{locale === 'ko' ? '비밀번호 확인' : 'Confirm password'}</span>
              <input required minLength={6} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호를 한 번 더 입력하세요" className="mt-1.5 min-h-12 w-full rounded-[12px] border border-gray-300 px-3.5 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
            </label>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
            <button disabled={busy} className="w-full min-h-12 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              {locale === 'ko' ? mode === 'signup' ? '회원가입' : mode === 'reset' ? '재설정 이메일 보내기' : '로그인' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'}
            </button>
          </form>
        )}

        {firebaseConfigured && mode !== 'reset' && <>
          <div className="flex items-center gap-3 my-5 text-xs text-gray-400">
            <span className="h-px bg-gray-200 flex-1" />
            {locale === 'ko' ? '또는' : 'or'}
            <span className="h-px bg-gray-200 flex-1" />
          </div>
          <button type="button" disabled={busy} onClick={() => void continueWithGoogle()} className="w-full min-h-12 rounded-[16px] border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm px-4 flex items-center justify-center gap-3 disabled:opacity-60 transition-colors">
            <svg aria-hidden="true" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.02 46.98 31.84 46.98 24.55Z" />
              <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
            </svg>
            {locale === 'ko' ? 'Google로 계속하기' : 'Continue with Google'}
          </button>
        </>}

        {firebaseConfigured && <div className="mt-6 text-center text-sm text-gray-500 space-y-3">
          {mode === 'login' && <button onClick={() => { setError(''); setMode('reset') }} className="block w-full hover:text-gray-900">{locale === 'ko' ? '비밀번호를 잊으셨나요?' : 'Forgot password?'}</button>}
          <p>
            {locale === 'ko' ? mode === 'signup' ? '이미 계정이 있나요?' : '처음 사용하시나요?' : mode === 'signup' ? 'Already have an account?' : 'New to pibi?'}{' '}
            <button onClick={() => { setError(''); setMode(mode === 'signup' ? 'login' : 'signup') }} className="font-bold text-blue-600 hover:text-blue-700">
              {locale === 'ko' ? mode === 'signup' ? '로그인' : '회원가입' : mode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>}
      </section>
    </main>
  )
}
