import { Code2, MonitorDown, FolderOpen, Play } from 'lucide-react'
import type { VibeRequest } from '../types'
import { useLocale } from '../contexts/LocaleContext'
import ReactPocDevHub from './ReactPocDevHub'

interface PocDevHubProps {
  projectId: string
  requests: VibeRequest[]
}

export default function PocDevHub({ projectId, requests }: PocDevHubProps) {
  const { locale } = useLocale()
  if (window.pibiDesktop) return <ReactPocDevHub key={projectId} projectId={projectId} requests={requests} />

  return (
    <div className="flex h-full items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><MonitorDown size={24} /></div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">pibi Desktop</p>
        <h2 className="text-xl leading-snug text-gray-900 sm:text-2xl">{locale === 'ko' ? '데스크톱에서 React PoC를 만들어보세요' : 'Build your React PoC on desktop'}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-500">{locale === 'ko' ? '같은 계정으로 데스크톱 앱에 로그인하고 이 프로젝트를 열어주세요. React 코드를 PC에 저장하고 직접 실행할 수 있습니다.' : 'Sign in to the desktop app with the same account and open this project to edit and run React code on your PC.'}</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><Code2 size={18} className="mt-0.5 shrink-0 text-blue-600" /><div><p className="text-sm font-semibold text-gray-800">{locale === 'ko' ? '코드 편집과 실행' : 'Edit and run'}</p><p className="mt-1 text-xs leading-5 text-gray-500">{locale === 'ko' ? 'React 코드를 작성하고 미리보세요.' : 'Write React code and see a preview.'}</p></div></div>
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><FolderOpen size={18} className="mt-0.5 shrink-0 text-blue-600" /><div><p className="text-sm font-semibold text-gray-800">{locale === 'ko' ? '이 PC에 저장' : 'Saved on this PC'}</p><p className="mt-1 text-xs leading-5 text-gray-500">{locale === 'ko' ? '프로젝트 폴더에서 소스를 관리하세요.' : 'Manage source files in your project folder.'}</p></div></div>
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs text-gray-500"><Play size={14} className="text-blue-600" />{locale === 'ko' ? '데스크톱 앱에서 프로젝트의 PoC 단계로 이동하세요.' : 'Open the PoC step in the desktop app.'}</p>
      </section>
    </div>
  )
}
