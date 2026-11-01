import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Info, Sparkles, CheckCircle2, History, Download, Plus, Play, Wrench, MessageCircle, X
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
import CoachChatPanel from '../components/CoachChatPanel'
import type { StepArtifact, StickyNote, StepInspection } from '../types'
import { useAuth } from '../auth/AuthContext'

export default function Workspace() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [inspecting, setInspecting] = useState(false)
  const [suggestingNotes, setSuggestingNotes] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  // Project Info
  const { data: project, isLoading: projectLoading } = useQuery({
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
  const { data: chatHistory = [] } = useQuery({
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
      console.error('Inspection failed:', err)
    } finally {
      setInspecting(false)
    }
  }

  // Suggest notes with AI
  const handleSuggestNotes = async () => {
    if (!id) return
    setSuggestingNotes(true)
    try {
      await api.notes.suggest(id, project?.description || project?.name || '급식 대기열 인식 서비스')
      await refetchNotes()
    } catch (err) {
      console.error('Failed to suggest notes:', err)
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
  const htmlArtifact = allArtifacts.find((a: StepArtifact) => a.type === 'html') ||
    allArtifacts.filter((a: StepArtifact) => a.type === 'html').slice(-1)[0]

  if (projectLoading || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-xs">작업 공간 로딩 중...</p>
        </div>
      </div>
    )
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
            <span>뒤로</span>
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
        {currentStep < STEPS.length - 1 && (
          <button
            onClick={() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))}
            className="min-h-10 flex items-center gap-1.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-bold transition-colors whitespace-nowrap"
          >
            <CheckCircle2 size={13} />
            다음 단계로
          </button>
        )}
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
                <span>{inspecting ? '점검 중...' : '사전 점검'}</span>
              </button>

              <button
                onClick={() => alert('산출물의 최신 버전이 자동 동기화되고 있습니다.')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <History size={13} />
                <span>버전 기록</span>
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
                  <span>노트 추가</span>
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
                <span>가져오기</span>
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
                onSave={(text) =>
                  saveArtifactMutation.mutate({ step: 1, type: 'markdown', content: text })
                }
              />
            )}

            {currentStep === 2 && (
              <ScreenDesignPreview
                htmlContent={currentStepArtifact?.content}
                onBuild={handleBuild}
                onFix={handleFix}
                building={inspecting}
              />
            )}

            {currentStep === 3 && (
              <PocDevHub
                htmlContent={htmlArtifact?.content || ''}
                requests={vibeRequests}
                onRegenerate={() => refetchArtifacts()}
              />
            )}
          </div>
        </div>

        {/* Right Column: AI Coach (봄비) Chat & Timer */}
        <div className="hidden xl:flex w-80 flex-col flex-shrink-0 overflow-hidden bg-white">
          <CoachChatPanel
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
          />
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
              <CoachChatPanel
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
              />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
