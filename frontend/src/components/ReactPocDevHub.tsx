import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { useEffect, useMemo, useState } from 'react'
import { Code2, FolderOpen, LoaderCircle, Play, Plus, Save, Wrench } from 'lucide-react'
import type { VibeRequest } from '../types'
import { useLocale } from '../contexts/LocaleContext'

const drafts = new Map<string, Record<string, string>>()

interface ReactPocDevHubProps {
  projectId: string
  requests: VibeRequest[]
}

export default function ReactPocDevHub({ projectId, requests }: ReactPocDevHubProps) {
  const { locale } = useLocale()
  const desktop = window.pibiDesktop
  const [files, setFiles] = useState<Record<string, string>>({})
  const [activeFile, setActiveFile] = useState('src/App.jsx')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [newFilePath, setNewFilePath] = useState('')
  const [showAddFile, setShowAddFile] = useState(false)
  const [packageName, setPackageName] = useState('')
  const [showPackages, setShowPackages] = useState(false)

  const labels = useMemo(() => locale === 'ko'
    ? { title: '로컬 React PoC', subtitle: '이 PC에 저장되는 실제 React 프로젝트를 편집하고 실행합니다.', save: '저장', run: '실행', build: '빌드', folder: '폴더 열기', add: '파일 추가', loading: '프로젝트 준비 중...', saved: 'PC에 저장했습니다.', built: 'React 빌드가 완료됐습니다.', localOnly: '프로젝트 소스는 이 PC의 문서 > Pibi React Projects에 저장됩니다.', history: '최근 요청', noHistory: '아직 개발 요청이 없습니다.', desktopOnly: '로컬 React 개발은 pibi 데스크톱 앱에서 사용할 수 있습니다.', openDesktop: '데스크톱 앱에서 이 프로젝트를 열어주세요.' }
    : { title: 'Local React PoC', subtitle: 'Edit and run a real React project stored on this PC.', save: 'Save', run: 'Run', build: 'Build', folder: 'Open folder', add: 'Add file', loading: 'Preparing your project...', saved: 'Saved on this PC.', built: 'React build completed.', localOnly: 'Source files are stored in Documents > Pibi React Projects on this PC.', history: 'Recent requests', noHistory: 'No development requests yet.', desktopOnly: 'Local React development is available in the pibi desktop app.', openDesktop: 'Open this project in the desktop app.'}, [locale])

  function requireDesktop() {
    if (!desktop) throw new Error('Open this project in the pibi desktop app to edit local React files.')
    return desktop
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    desktop?.getProjectFiles(projectId)
      .then((result) => {
        if (!active) return
        setFiles(drafts.get(projectId) ?? result.files)
        setDirty(drafts.has(projectId))
        if (!result.files[activeFile]) setActiveFile(Object.keys(result.files).find((file) => file !== 'index.html') ?? 'src/App.jsx')
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not open the local React project.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [desktop, projectId])

  useEffect(() => {
    if (!dirty || busy || loading || error) return
    const timer = window.setTimeout(() => { void save() }, 1200)
    return () => window.clearTimeout(timer)
  }, [files, dirty, busy, loading, error])

  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (dirty || busy) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty, busy])

  if (!desktop) {
    return <div className="flex h-full items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center"><Code2 size={28} className="mx-auto mb-4 text-blue-600" /><h2 className="text-xl text-gray-900">{labels.desktopOnly}</h2><p className="mt-2 text-sm text-gray-500">{labels.openDesktop}</p></div></div>
  }

  async function save() {
    setBusy(true); setError(''); setMessage('')
    try {
      await requireDesktop().saveProjectFiles(projectId, files)
      drafts.delete(projectId); setDirty(false); setMessage(labels.saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save files.')
    } finally { setBusy(false) }
  }

  async function runPreview() {
    setBusy(true); setError(''); setMessage('')
    try {
      await requireDesktop().saveProjectFiles(projectId, files)
      drafts.delete(projectId); setDirty(false)
      const result = await requireDesktop().startPreview(projectId)
      setPreviewUrl(result.url)
      setMessage(locale === 'ko' ? '로컬 React 미리보기를 실행 중입니다.' : 'Local React preview is running.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the preview.')
    } finally { setBusy(false) }
  }

  async function build() {
    setBusy(true); setError(''); setMessage('')
    try {
      await requireDesktop().saveProjectFiles(projectId, files)
      drafts.delete(projectId); setDirty(false)
      const result = await requireDesktop().buildProject(projectId)
      setMessage(`${labels.built} ${result.outputPath}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'React build failed.')
    } finally { setBusy(false) }
  }

  async function addFile() {
    const relativePath = newFilePath.trim()
    if (!relativePath || busy || loading) return
    setBusy(true); setError('')
    try {
      await requireDesktop().saveProjectFiles(projectId, files)
      await requireDesktop().createProjectFile(projectId, relativePath)
      const result = await requireDesktop().getProjectFiles(projectId)
      setFiles(result.files); setActiveFile(relativePath); drafts.delete(projectId); setDirty(false)
      setShowAddFile(false); setNewFilePath('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the file.')
    } finally { setBusy(false) }
  }

  async function installPackage() {
    if (busy || !packageName.trim()) return
    setBusy(true); setError(''); setPreviewUrl('')
    setMessage(locale === 'ko' ? '라이브러리 설치 중… 완료 후 실행을 눌러주세요.' : 'Installing package… press Run when complete.')
    try {
      await requireDesktop().saveProjectFiles(projectId, files)
      drafts.delete(projectId); setDirty(false)
      const result = await requireDesktop().installPackage(projectId, packageName.trim())
      setMessage(result.output); setPackageName(''); setShowPackages(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Installation failed') }
    finally { setBusy(false) }
  }

  async function openFolder() {
    try { await requireDesktop().openProjectFolder(projectId) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not open the project folder.') }
  }

  const sourceFiles = Object.keys(files).sort()

  return (
    <section onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (!busy && !loading && dirty) void save() } }} className="flex h-full min-h-0 flex-col bg-gray-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div><div className="flex items-center gap-2"><Code2 size={18} className="text-blue-600" /><h2 className="text-base text-gray-900">{labels.title}</h2><span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">React + Vite</span></div><p className="mt-1 text-xs text-gray-500">{labels.subtitle}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy || loading} onClick={() => setShowPackages(!showPackages)} className="h-9 rounded-lg border border-gray-300 px-3 text-xs font-semibold">{locale === 'ko' ? '라이브러리 설치' : 'Install package'}</button>
          <button disabled={busy || loading} onClick={() => setShowAddFile(!showAddFile)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"><Plus size={14} />{labels.add}</button>
          <button onClick={() => void openFolder()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"><FolderOpen size={14} />{labels.folder}</button>
          <button disabled={busy || loading || !dirty} onClick={() => void save()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Save size={14} />{labels.save}</button>
          <button disabled={busy || loading} onClick={() => void runPreview()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Play size={14} />{labels.run}</button>
          {previewUrl && <button disabled={busy} onClick={async () => { setBusy(true); try { await requireDesktop().stopPreview(projectId); setPreviewUrl(''); setMessage(locale === 'ko' ? '미리보기를 종료했습니다.' : 'Preview stopped.') } catch (err) { setError(err instanceof Error ? err.message : 'Could not stop preview.') } finally { setBusy(false) } }} className="h-9 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 disabled:opacity-50">{locale === 'ko' ? '중지' : 'Stop'}</button>}
          <button disabled={busy || loading} onClick={() => void build()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Wrench size={14} />{labels.build}</button>
        </div>
      </header>
      {showPackages && <form className="flex flex-wrap gap-2 border-b bg-white p-3" onSubmit={(event) => { event.preventDefault(); void installPackage() }}>
        <input aria-label="npm package" placeholder="lucide-react" value={packageName} onChange={(event) => setPackageName(event.target.value)} disabled={busy} className="min-w-0 flex-1 rounded border p-2 font-mono text-sm" />
        <button disabled={busy || !packageName.trim()} className="rounded bg-blue-600 px-3 text-sm text-white disabled:opacity-50">{locale === 'ko' ? '설치' : 'Install'}</button>
        <p className="w-full text-xs text-gray-500">{locale === 'ko' ? '설치에는 인터넷이 필요합니다. 설치 스크립트가 필요한 패키지는 별도 설정이 필요할 수 있습니다.' : 'Internet required. Packages requiring installation scripts may need additional setup.'}</p>
      </form>}
      {showAddFile && <form className="flex gap-2 border-b bg-white p-3" onSubmit={(event) => { event.preventDefault(); void addFile() }}>
        <input autoFocus aria-label="New file path" placeholder="src/components/Header.jsx" value={newFilePath} onChange={(event) => setNewFilePath(event.target.value)} className="min-w-0 flex-1 rounded border p-2 font-mono text-sm" disabled={busy} />
        <button type="submit" disabled={busy || !newFilePath.trim()} className="rounded bg-blue-600 px-3 text-sm text-white disabled:opacity-50">{labels.add}</button>
        <button type="button" onClick={() => setShowAddFile(false)} className="px-3 text-sm">{locale === 'ko' ? '취소' : 'Cancel'}</button>
      </form>}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-[42%] min-w-0 flex-1 flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50 px-3 pt-2">
            {sourceFiles.map((file) => <button key={file} onClick={() => setActiveFile(file)} className={`max-w-56 truncate rounded-t-lg px-3 py-2 text-xs ${activeFile === file ? 'border border-b-white border-gray-200 bg-white font-semibold text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}>{file}</button>)}
          </div>
          {loading ? <div className="flex flex-1 items-center justify-center text-sm text-gray-500"><LoaderCircle size={18} className="mr-2 animate-spin" />{labels.loading}</div> : <div className="min-h-0 flex-1 overflow-auto"><CodeMirror aria-label={activeFile} value={files[activeFile] ?? ''} editable={!busy} height="100%" extensions={[activeFile.endsWith('.css') ? css() : activeFile.endsWith('.json') ? json() : activeFile.endsWith('.html') ? html() : javascript({ jsx: true, typescript: /\.tsx?$/.test(activeFile) })]} onChange={(value) => { const next = { ...files, [activeFile]: value }; drafts.set(projectId, next); setFiles(next); setDirty(true); setMessage(''); setError('') }} basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }} /></div>}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-[11px] text-gray-500"><span>{activeFile} {busy ? '· …' : dirty ? (locale === 'ko' ? '· 저장 대기' : '· pending save') : ''}</span><span>{labels.localOnly}</span></div>
        </div>

        <div className="flex min-h-[42%] min-w-0 flex-1 flex-col bg-gray-100 lg:min-h-0">
          <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4"><span className="flex items-center gap-2 text-xs font-semibold text-gray-700"><span className={`h-2 w-2 rounded-full ${previewUrl ? 'bg-emerald-500' : 'bg-slate-300'}`} />{locale === 'ko' ? '실행 미리보기' : 'Live preview'}</span><span className="truncate pl-3 font-mono text-[10px] text-gray-400">{previewUrl || (locale === 'ko' ? '실행을 눌러 미리보기를 시작하세요' : 'Press Run to start the preview')}</span></div>
          {previewUrl ? <iframe key={previewUrl} src={previewUrl} title="Local React PoC preview" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads" className="min-h-0 flex-1 border-0 bg-white" /> : <div className="flex flex-1 items-center justify-center text-center text-sm text-gray-500"><div><Play size={24} className="mx-auto mb-3 text-gray-400" />{locale === 'ko' ? 'React 코드를 실행해 화면을 확인하세요.' : 'Run your React code to see the app.'}</div></div>}
          {(message || error) && <p role={error ? 'alert' : 'status'} className={`max-h-36 overflow-auto whitespace-pre-wrap border-t bg-white px-4 py-2 text-xs ${error ? 'border-red-200 text-red-700' : 'border-gray-200 text-green-700'}`}>{error || message}</p>}
          <details className="border-t border-gray-200 bg-white px-4 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-gray-700">{labels.history} ({requests.length})</summary>
            <div className="max-h-24 overflow-y-auto pt-2">{requests.length ? requests.slice(0, 5).map((request) => <p key={request.id} className="truncate py-1 text-xs text-gray-500">{request.prompt}</p>) : <p className="py-1 text-xs text-gray-400">{labels.noHistory}</p>}</div>
          </details>
        </div>
      </div>
    </section>
  )
}
