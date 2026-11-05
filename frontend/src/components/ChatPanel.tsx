import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { api } from '../api/client'
import type { ChatMessage, StepArtifact } from '../types'

interface ChatPanelProps {
  projectId: string
  projectName: string
  step: number
  history: ChatMessage[]
  allArtifacts: StepArtifact[]
  onArtifactUpdate?: () => void
}

function buildContext(artifacts: StepArtifact[], currentStep: number): Record<string, string> {
  const ctx: Record<string, string> = {}
  for (const art of artifacts) {
    if (art.step < currentStep) {
      const key = `step${art.step}_${art.type}`
      ctx[key] = art.content
    }
  }
  return ctx
}

export default function ChatPanel({
  projectId,
  projectName,
  step,
  history,
  allArtifacts,
  onArtifactUpdate,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(
    history.map((m) => ({ role: m.role, content: m.content }))
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [chatError, setChatError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages(history.map((m) => ({ role: m.role, content: m.content })))
  }, [history])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  // Auto-init if no messages
  useEffect(() => {
    if (history.length === 0 && !loading && !streaming) {
      setLoading(true)
      api.ai
        .init({
          project_id: projectId,
          step,
          project_name: projectName,
          context: buildContext(allArtifacts, step),
        })
        .then((res) => {
          const msg = { role: 'assistant' as const, content: res.message }
          setMessages([msg])
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || streaming) return
    setInput('')
    setChatError('')
    const userMsg = { role: 'user' as const, content: text }
    setMessages((prev) => [...prev, userMsg])
    setStreaming(true)
    setStreamText('')

    let full = ''
    try {
      await api.ai.chat(
        {
          project_id: projectId,
          step,
          message: text,
          history: messages.slice(-10),
          context: buildContext(allArtifacts, step),
        },
        (chunk) => {
          full += chunk
          setStreamText(full)
        },
        () => {
          setMessages((prev) => [...prev, { role: 'assistant', content: full }])
          setStreamText('')
          setStreaming(false)
          onArtifactUpdate?.()
        }
      )
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '⚠️ 오류가 발생했습니다. 다시 시도해주세요.'
      setChatError(errMsg)
      setStreaming(false)
      setStreamText('')
    }
  }, [input, loading, streaming, messages, projectId, step, allArtifacts, onArtifactUpdate])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">
          <Sparkles size={14} className="text-brand-600" />
        </div>
        <span className="text-sm font-semibold text-gray-700">AI 어시스턴트</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-brand-600" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-brand-500" />
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.role === 'user' ? 'bg-brand-600' : 'bg-gray-100'
              }`}
            >
              {m.role === 'user' ? (
                <User size={14} className="text-white" />
              ) : (
                <Bot size={14} className="text-gray-600" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-sm'
                  : 'bg-gray-50 text-gray-800 rounded-tl-sm'
              }`}
            >
              {m.role === 'assistant' ? (
                <div className="prose prose-sm prose-gray max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {streaming && streamText && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-gray-600" />
            </div>
            <div className="max-w-[85%] bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800">
              <div className="prose prose-sm prose-gray max-w-none">
                <ReactMarkdown>{streamText}</ReactMarkdown>
              </div>
              <span className="inline-block w-1.5 h-4 bg-brand-500 animate-pulse ml-1 rounded-sm" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {chatError && <p role="alert" className="px-4 py-2 text-xs text-red-700">{chatError}</p>}
      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2 items-end bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:ring-2 focus-within:ring-brand-400 focus-within:border-brand-300">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="메시지를 입력하세요... (Enter로 전송)"
            rows={2}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none px-2 py-1 text-gray-800 placeholder-gray-400"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading || streaming}
            className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {loading || streaming ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <Send size={16} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">Shift+Enter로 줄바꿈</p>
      </div>
    </div>
  )
}
