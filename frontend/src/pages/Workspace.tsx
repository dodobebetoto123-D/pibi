import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Info, Sparkles, CheckCircle2, History, Download, Plus, Play, Wrench, MessageCircle, X, Users, Copy, Mail
} from 'lucide-react'
import { api } from '../api/client'
import { STEPS } from '../types'
import Navbar from '../components/Navbar'
import VoyageNavigator from '../components/VoyageNavigator'
import GuidePanel from '../components/GuidePanel'
import InspectionBanner from '../components/InspectionBanner'
import BrainstormCanvas from '../components/BrainstormCanvas'
import PipelinePlanEditor from '../components/PipelinePlanEditor'
import ScreenDesignPreview from '../components/ScreenDesignPreview'
import PocDevHub from '../components/PocDevHub'
import CoachChatPanel from '../components/WorkspaceChatPanel'
import type { StepArtifact, StickyNote, StepInspection } from '../types'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
import { productStore } from '../lib/productStore'

export default function Workspace() {
  const { user } = useAuth()
  const { locale, t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [inspecting, setInspecting] = useState(false)
  const [suggestingNotes, setSuggestingNotes] = useState(false)
  const [actionError, setActionError] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionError, setVersionError] = useState('')

  const { data: versions = [], isLoading: versionsLoading, error: versionsError, refetch: refetchVersions } = useQuery({
    queryKey: ['artifactVersions', id, currentStep],
    queryFn: () => api.artifacts.versions(id!, currentStep),
    enabled: !!id && versionsOpen,
  })

  // Project Info
  const { data: project, isLoading: projectLoading, error: projectError, refetch: refetchProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id!),
    enabled: !!id,
  })

  // Artifacts
  const { data: allArtifacts = [], refetch: refetchArtifacts } = useQuery({
    queryKey: ['artifacts', id],
    queryFn: () => api.artifacts.list(id!),
    enabled: !!id,
  })

  // Sticky Notes (Step 0)
  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => api.notes.list(id!),
    enabled: !!id,
  })

  // Vibe Requests (Step 3)
  const { data: vibeRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['vibeRequests', id],
    queryFn: () => api.vibeRequests.list(id!),
    enabled: !!id,
  })

  // Inspection for current step
  const { data: inspection, refetch: refetchInspection } = useQuery<StepInspection | null>({
    queryKey: ['inspection', id, currentStep],
    queryFn: () => api.inspections.get(id!, currentStep),
    enabled: !!id,
  })

  // Chat History
  const { data: chatHistory = [], isLoading: chatLoading, error: chatError } = useQuery({
    queryKey: ['chat', id, currentStep],
    queryFn: () => api.chat.history(id!, currentStep),
    enabled: !!id,
  })

  // Sticky notes mutations
  const addNoteMutation = useMutation({
    mutationFn: ({ content, color }: { content: string; color: string }) =>
      api.notes.create(id!, { content, color }),
    onSuccess: () => refetchNotes(),
  })

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: Partial<StickyNote> }) =>
      api.notes.update(id!, noteId, data),
    onSuccess: () => refetchNotes(),
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.notes.delete(id!, noteId),
    onSuccess: () => refetchNotes(),
  })

  // Save artifact mutation
  const saveArtifactMutation = useMutation({
    mutationFn: ({ step, type, content }: { step: number; type: string; content: string }) =>
      api.artifacts.save(id!, { step, type, content }),
    onSuccess: () => refetchArtifacts(),
  })

  // Run AI Inspection
  const handleInspect = async () => {
    if (!id) return
    setInspecting(true)
    setActionError('')
    try {
      const art = allArtifacts.find((a: StepArtifact) => a.step === currentStep)
      const noteContents = notes.map((n) => n.content)
      await api.inspections.inspect({
        project_id: id,
        step: currentStep,
        content: art?.content || '',
        notes: currentStep === 0 ? noteContents : [],
      })
      await refetchInspection()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '사전 점검을 완료하지 못했습니다.')
    } finally {
      setInspecting(false)
    }
  }

  // Suggest notes with AI
  const handleSuggestNotes = async () => {
    if (!id) return
    setSuggestingNotes(true)
    setActionError('')
    try {
      await api.notes.suggest(id, project?.description || project?.name || '급식 대기열 인식 서비스')
      await refetchNotes()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '메모를 추천하지 못했습니다.')
    } finally {
      setSuggestingNotes(false)
    }
  }

  // Build moves the user into the PoC stage; Fix runs the real AI inspection.
  const handleBuild = () => setCurrentStep(3)

  const handleFix = () => handleInspect()

  // Completed steps calculation
  const completedSteps = new Set<number>(
    allArtifacts.map((a: StepArtifact) => a.step)
  )

  const currentStepArtifact = allArtifacts.find((a: StepArtifact) => a.step === currentStep)

  if (projectLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-xs">{t('projectLoading')}</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return <div role="alert" className="flex h-screen items-center justify-center bg-gray-50 p-6 text-center"><div><p className="text-sm text-red-700">{projectError instanceof Error ? projectError.message : '프로젝트를 불러오지 못했습니다.'}</p><button onClick={() => void refetchProject()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white">다시 시도</button><button onClick={() => navigate('/')} className="ml-3 text-sm text-gray-600">프로젝트 목록</button></div></div>
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
      {/* 1. Global Navbar */}
      <Navbar projectId={id} />

      {/* 2. Project Subheader (Breadcrumb & Meta) */}
      <div className="min-h-11 px-3 sm:px-5 border-b border-gray-200/80 bg-white flex items-center justify-between gap-2 flex-shrink-0 select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft size={16} />
            <span>{t('back')}</span>
          </button>

          <span className="w-px h-4 bg-gray-200" />

          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xs font-extrabold text-gray-900 tracking-tight truncate max-w-[32vw] sm:max-w-none">{project.name}</h2>
            <span className="hidden lg:inline text-[11px] text-gray-400">{user?.email}</span>
            <button className="hidden sm:block text-gray-400 hover:text-gray-600">
              <Info size={13} />
            </button>
          </div>
        </div>

        {/* Advance step quick button */}
        <div className="flex items-center gap-2 shrink-0">
        {project.owner_uid === user?.uid && (
          <button onClick={() => { setInviteOpen(true); setInviteError('') }} className="min-h-10 flex items-center gap-1.5 px-3 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Users size={14} /><span className="hidden sm:inline">{t('inviteToProject')}</span>
          </button>
        )}
        {currentStep < STEPS.length - 1 && (
          <button
            onClick={() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))}
            className="min-h-10 flex items-center gap-1.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-bold transition-colors whitespace-nowrap"
          >
            <CheckCircle2 size={13} />
            {t('nextStep')}
          </button>
        )}
        </div>
      </div>

      {/* 3. Main Workspace 4-Panel Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Leftmost Column: Navigator + Guide */}
        <div className="hidden lg:flex w-64 flex-col border-r border-gray-200/80 bg-white flex-shrink-0">
          <div className="h-1/2 border-b border-gray-200/80 overflow-hidden flex flex-col">
            <VoyageNavigator
              currentStep={currentStep}
              onSelect={(s) => setCurrentStep(s)}
              completedSteps={completedSteps}
            />
          </div>
          <div className="h-1/2 overflow-hidden flex flex-col">
            <GuidePanel step={currentStep} />
          </div>
        </div>

        {/* Center Column: Step Canvas & Actions */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden bg-white">
          {/* Action Bar (사전 점검, 버전 기록, + 노트 추가, 가져오기 등) */}
          <div className="h-12 px-3 sm:px-5 border-b border-gray-200/80 bg-white flex items-center justify-between gap-3 flex-shrink-0 select-none">
            <div className="flex items-center gap-2 min-w-0 overflow-x-auto [scrollbar-width:none]">
              {/* 사전 점검 (보라색 버튼) */}
              <button
                onClick={handleInspect}
                disabled={inspecting}
                className="min-h-10 flex items-center gap-1.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Sparkles size={13} className={inspecting ? 'animate-spin' : ''} />
                <span>{inspecting ? t('checking') : t('precheck')}</span>
              </button>

              <button
                onClick={() => { setVersionError(''); setVersionsOpen(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <History size={13} />
                <span>{t('versionHistory')}</span>
              </button>

              {/* Step 0 Specific Action: + 노트 추가 */}
              {currentStep === 0 && (
                <button
                  onClick={() => {
                    const text = prompt('새 포스트잇 내용을 입력하세요:')
                    if (text?.trim()) {
                      addNoteMutation.mutate({ content: text.trim(), color: '#fef08a' })
                    }
                  }}
                className="min-h-10 flex items-center gap-1 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <Plus size={13} />
                  <span>{t('addNote')}</span>
                </button>
              )}

              {/* Step 2/3 Specific Actions: Build, Fix */}
              {currentStep === 2 && (
                <>
                  <button
                    onClick={handleBuild}
                    disabled={inspecting}
                    className="min-h-10 flex items-center gap-1 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <Play size={12} />
                    <span>Build</span>
                  </button>
                  <button
                    onClick={handleFix}
                    disabled={inspecting}
                    className="min-h-10 flex items-center gap-1 px-3 sm:px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-[12px] text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <Wrench size={12} />
                    <span>Fix</span>
                  </button>
                </>
              )}

              <button
                onClick={() => alert('기본 템플릿과 이전 단계 산출물이 연결되어 있습니다.')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Download size={13} />
                <span>{t('import')}</span>
              </button>
            </div>

            <div className="text-[11px] text-gray-400 font-mono">
              Step {currentStep + 1} of 4
            </div>
          </div>

          <nav aria-label="작업 단계" className="lg:hidden flex gap-2 px-3 py-2.5 border-b border-gray-200 overflow-x-auto flex-shrink-0">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                aria-current={currentStep === step.id ? 'step' : undefined}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${currentStep === step.id ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                {step.shortLabel}
              </button>
            ))}
          </nav>

          {/* AI Inspection Feedback Banner */}
          {actionError && <div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{actionError}</div>}
          <InspectionBanner
            inspection={inspection ?? null}
            loading={inspecting}
            onInspect={handleInspect}
          />

          {/* Dynamic Step Canvas View */}
          <div className="flex-1 overflow-hidden relative">
            {currentStep === 0 && (
              <BrainstormCanvas
                notes={notes}
                onAddNote={(content, color) => addNoteMutation.mutate({ content, color })}
                onUpdateNote={(noteId, data) => updateNoteMutation.mutate({ noteId, data })}
                onDeleteNote={(noteId) => deleteNoteMutation.mutate(noteId)}
                onSuggestNotes={handleSuggestNotes}
                suggesting={suggestingNotes}
              />
            )}

            {currentStep === 1 && (
              <PipelinePlanEditor
                content={currentStepArtifact?.content || ''}
                notes={notes.map((note) => note.content)}
                onSave={(text) =>
                  saveArtifactMutation.mutateAsync({ step: 1, type: 'markdown', content: text })
                }
              />
            )}

            {currentStep === 2 && (
              <ScreenDesignPreview
                htmlContent={allArtifacts.find((artifact: StepArtifact) => artifact.step === 2 && (artifact.type === 'html' || artifact.type === 'json'))?.content}
                onBuild={handleBuild}
                onFix={handleFix}
                building={inspecting}
              />
            )}

            {currentStep === 3 && (
              <PocDevHub
                projectId={id!}
                requests={vibeRequests}
              />
            )}
          </div>
        </div>

        {/* Right Column: AI Coach (봄비) Chat & Timer */}
        <div className="hidden xl:flex w-80 flex-col flex-shrink-0 overflow-hidden bg-white">
          {chatLoading ? <p className="p-4 text-sm text-gray-500">대화를 불러오는 중...</p> : chatError ? <p role="alert" className="p-4 text-sm text-red-700">대화를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p> : <CoachChatPanel
            key={`${id}-${currentStep}`}
            projectId={id!}
            projectName={project.name}
            step={currentStep}
            history={chatHistory}
            allArtifacts={allArtifacts}
            onArtifactUpdate={() => {
              refetchArtifacts()
              refetchNotes()
              refetchRequests()
            }}
          />}
        </div>
      </div>

      <button
        onClick={() => setMobileChatOpen(true)}
        className="xl:hidden fixed bottom-5 right-5 z-40 min-h-12 flex items-center gap-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-gray-900/10 text-sm font-semibold"
        aria-label="AI 코치 열기"
      >
        <MessageCircle size={18} /> AI 코치
      </button>

      {mobileChatOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
          <button
            onClick={() => setMobileChatOpen(false)}
            className="absolute inset-0 bg-gray-900/40"
            aria-label="AI 코치 닫기"
          />
          <section className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <header className="h-14 flex items-center justify-between border-b border-gray-200 px-4">
              <h2 className="text-sm font-semibold text-gray-900">AI 코치</h2>
              <button
                onClick={() => setMobileChatOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              {chatLoading ? <p className="p-4 text-sm text-gray-500">대화를 불러오는 중...</p> : chatError ? <p role="alert" className="p-4 text-sm text-red-700">대화를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p> : <CoachChatPanel
                key={`${id}-${currentStep}`}
                projectId={id!}
                projectName={project.name}
                step={currentStep}
                history={chatHistory}
                allArtifacts={allArtifacts}
                onArtifactUpdate={() => {
                  refetchArtifacts()
                  refetchNotes()
                  refetchRequests()
                }}
              />}
            </div>
          </section>
        </div>
      )}

      {versionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <section role="dialog" aria-modal="true" aria-label="버전 기록" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between"><h2 className="text-lg">버전 기록</h2><button onClick={() => setVersionsOpen(false)} aria-label="닫기"><X size={18} /></button></div>
            <p className="mt-2 text-xs text-gray-500">변경된 산출물을 저장할 때마다 기록됩니다. 복원도 새 버전으로 저장됩니다.</p>
            {(versionError || versionsError) && <p role="alert" className="mt-3 text-sm text-red-700">{versionError || (versionsError instanceof Error ? versionsError.message : '기록을 불러오지 못했습니다.')}</p>}
            <div className="mt-4 max-h-80 space-y-2 overflow-auto">
              {versionsLoading ? <p className="text-sm text-gray-500">불러오는 중...</p> : versions.length === 0 ? <p className="text-sm text-gray-500">아직 저장된 버전이 없습니다.</p> : versions.map((version) => <div key={version.id} className="rounded-xl border border-gray-200 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold">{new Date(version.updated_at).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')} · {version.type}</span><button disabled={saveArtifactMutation.isPending} onClick={async () => { if (!window.confirm('선택한 버전을 복원할까요? 저장하지 않은 편집 내용은 사라질 수 있습니다.')) return; try { await saveArtifactMutation.mutateAsync({ step: version.step, type: version.type, content: version.content }); await refetchVersions(); setVersionsOpen(false) } catch (error) { setVersionError(error instanceof Error ? error.message : '복원하지 못했습니다.') } }} className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50">복원</button></div><p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-gray-500">{version.content || '(빈 문서)'}</p></div>)}
            </div>
          </section>
        </div>
      )}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="invite-title" className="text-lg text-gray-900">{t('inviteToProject')}</h2><p className="mt-1 text-sm text-gray-500">{project.name}</p></div>
              <button onClick={() => setInviteOpen(false)} aria-label={t('cancel')} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
            </div>
            {!inviteLink ? <form onSubmit={async (event) => {
              event.preventDefault()
              if (!user) return
              setInviteBusy(true)
              setInviteError('')
              try {
                const invitation = await productStore.createInvitation({ projectId: id!, projectName: project.name, email: inviteEmail, inviter: user })
                setInviteLink(`${window.location.origin}/invite/${invitation.id}`)
              } catch (error) {
                setInviteError(error instanceof Error ? error.message : '초대 링크를 만들지 못했습니다.')
              } finally {
                setInviteBusy(false)
              }
            }} className="mt-6 space-y-4">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">{t('inviteEmail')}</span><input type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@example.com" className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
              <p className="text-xs leading-5 text-gray-500">{locale === 'ko' ? '초대 링크는 7일 동안 유효하며, 지정한 이메일 계정으로 로그인해야 수락할 수 있습니다.' : 'The link expires in 7 days and can only be accepted by the invited email account.'}</p>
              {inviteError && <p role="alert" className="text-sm text-red-700">{inviteError}</p>}
              <button disabled={inviteBusy} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{inviteBusy ? (locale === 'ko' ? '초대 생성 중...' : 'Creating invite...') : t('sendInvite')}</button>
            </form> : <div className="mt-6 space-y-4">
              <p role="status" className="text-sm text-green-700">{t('inviteCreated')}</p>
              <div className="break-all rounded-xl bg-gray-50 p-3 text-xs text-gray-700">{inviteLink}</div>
              <div className="flex gap-2">
                <button onClick={async () => { try { await navigator.clipboard.writeText(inviteLink); setInviteCopied(true) } catch { setInviteError(locale === 'ko' ? '클립보드에 복사하지 못했습니다. 링크를 직접 선택해 복사해 주세요.' : 'Could not copy. Select and copy the link manually.') } }} className="min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"><Copy size={15} />{inviteCopied ? (locale === 'ko' ? '복사 완료' : 'Copied') : t('copyInvite')}</button>
                <a href={`mailto:${encodeURIComponent(inviteEmail)}?subject=${encodeURIComponent(`${project.name} 초대`)}&body=${encodeURIComponent(`pibi 프로젝트에 초대합니다. 아래 링크를 열어 초대받은 이메일 계정으로 로그인해 주세요.\n\n${inviteLink}`)}`} className="min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Mail size={15} />Email</a>
              </div>
              <button onClick={() => { setInviteOpen(false); setInviteEmail(''); setInviteLink('') }} className="w-full py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">{t('cancel')}</button>
            </div>}
          </section>
        </div>
      )}
    </div>
  )
}
