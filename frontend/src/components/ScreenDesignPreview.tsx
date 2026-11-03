import { useState } from 'react'
import { Monitor, Smartphone, Play, Wrench } from 'lucide-react'

interface ScreenDesignPreviewProps {
  htmlContent?: string
  onBuild: () => void
  onFix: () => void
  building: boolean
}

interface Screen {
  name: string
  layout: string
  components: string[]
}

function parseScreens(content: string): Screen[] {
  try {
    const parsed: unknown = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object' || !('screens' in parsed) || !Array.isArray(parsed.screens)) return []
    return parsed.screens.filter((screen: unknown): screen is Screen => {
      if (!screen || typeof screen !== 'object') return false
      const value = screen as Record<string, unknown>
      return typeof value.name === 'string' && typeof value.layout === 'string' && Array.isArray(value.components) && value.components.every((item: unknown) => typeof item === 'string')
    })
  } catch {
    return []
  }
}

export default function ScreenDesignPreview({ htmlContent = '', onBuild, onFix, building }: ScreenDesignPreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const screens = parseScreens(htmlContent)
  const isHtml = /^\s*(?:<!doctype\s+html|<html|<body|<div|<main)/i.test(htmlContent)

  return (
    <section className="flex h-full flex-col overflow-hidden bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-3">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          <button type="button" aria-label="데스크톱 보기" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')} className={`rounded-lg p-2 ${device === 'desktop' ? 'bg-white text-blue-600' : 'text-gray-500'}`}><Monitor size={16} /></button>
          <button type="button" aria-label="모바일 보기" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')} className={`rounded-lg p-2 ${device === 'mobile' ? 'bg-white text-blue-600' : 'text-gray-500'}`}><Smartphone size={16} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={onFix} disabled={building} className="flex min-h-10 items-center gap-1 rounded-xl border border-gray-300 px-4 text-xs font-semibold disabled:opacity-50"><Wrench size={14} />{building ? '점검 중...' : 'AI 점검'}</button>
          <button onClick={onBuild} disabled={building} className="flex min-h-10 items-center gap-1 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white disabled:opacity-50"><Play size={14} />PoC로 이동</button>
        </div>
      </header>
      <div className="flex flex-1 justify-center overflow-auto bg-gray-50 p-6">
        <div className={`min-h-full w-full overflow-hidden rounded-2xl border border-gray-200 bg-white ${device === 'mobile' ? 'max-w-[380px]' : 'max-w-4xl'}`}>
          {isHtml ? <iframe title="화면 설계 미리보기" sandbox="allow-scripts allow-forms" srcDoc={htmlContent} className="h-full min-h-[540px] w-full border-0" /> : screens.length ? (
            <div className="space-y-5 p-6">
              <p className="text-xs text-gray-500">프로젝트에서 생성한 화면 구성입니다.</p>
              {screens.map((screen, index) => <article key={`${screen.name}-${index}`} className="rounded-2xl border border-gray-200 p-5"><h3 className="text-base text-gray-900">{screen.name}</h3><p className="mt-1 text-xs text-gray-500">{screen.layout}</p><ul className="mt-4 space-y-2">{screen.components.map((item, i) => <li key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{item}</li>)}</ul></article>)}
            </div>
          ) : <div className="flex min-h-[400px] items-center justify-center p-8 text-center text-sm text-gray-500">{htmlContent ? '이 화면 설계는 미리보기를 지원하지 않습니다. AI 채팅에서 화면 구성을 다시 요청해주세요.' : '아직 화면 설계가 없습니다. AI 채팅에서 만들 화면을 설명해 주세요.'}</div>}
        </div>
      </div>
    </section>
  )
}
