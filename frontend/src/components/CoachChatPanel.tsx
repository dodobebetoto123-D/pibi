import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Bot, User, Mic, MicOff, Clock, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { api } from '../api/client'
import type { ChatMessage, StepArtifact } from '../types'

interface CoachChatPanelProps {
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

export default function CoachChatPanel({
  projectId,
  projectName,
  step,
  history,
  allArtifacts,
  onArtifactUpdate,
}: CoachChatPanelProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(
    history.map((m) => ({ role: m.role, content: m.content }))
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  // Countdown timer state (e.g. hackathon countdown)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    // Target 6 hours from session start
    const timer = setInterval(() => {
      // Just demo static or ticking down
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
          api.chat.save(projectId, { step, role: 'assistant', content: res.message })
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
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errMsg}` },
      ])
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

  // Voice STT Toggle
  const toggleSpeech = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('사용하시는 브라우저가 음성 입력을 지원하지 않습니다. Chrome 브라우저를 권장합니다.')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setIsRecording(false)
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const insertMention = (tag: string) => {
    setInput((prev) => (prev ? `${prev} ${tag} ` : `${tag} `))
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 overflow-hidden">
      {/* Top Countdown Timer Card */}
      <div className="p-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
          <div className="flex items-center gap-1.5 text-gray-700">
            <Clock size={13} className="text-gray-400" />
            <span>시간 종료</span>
          </div>
          <span className="text-[10px] text-gray-400">세션 타이머</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white p-1.5 rounded-[12px] border border-gray-200">
            <span className="font-mono font-bold text-sm text-gray-800 block">00</span>
            <span className="text-[9px] text-gray-400 font-medium">일</span>
          </div>
          <div className="bg-white p-1.5 rounded-[12px] border border-gray-200">
            <span className="font-mono font-bold text-sm text-gray-800 block">00</span>
            <span className="text-[9px] text-gray-400 font-medium">시간</span>
          </div>
          <div className="bg-white p-1.5 rounded-[12px] border border-gray-200">
            <span className="font-mono font-bold text-sm text-gray-800 block">00</span>
            <span className="text-[9px] text-gray-400 font-medium">분</span>
          </div>
          <div className="bg-white p-1.5 rounded-[12px] border border-gray-200">
            <span className="font-mono font-bold text-sm text-gray-800 block">00</span>
            <span className="text-[9px] text-gray-400 font-medium">초</span>
          </div>
        </div>
      </div>

      {/* Chat Header */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs">
            🌱
          </div>
          <span className="text-xs font-bold text-gray-800">그룹 채팅 (봄비)</span>
          <span className="w-2 h-2 rounded-full bg-blue-600" />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-gray-50/40">
        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 text-xs">
              🌱
            </div>
            <div className="bg-white border border-gray-200 rounded-[16px] rounded-tl-xs px-4 py-3">
              <Loader2 size={16} className="animate-spin text-blue-600" />
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {m.role === 'user' ? <User size={13} /> : '🌱'}
            </div>
            <div className="flex flex-col max-w-[85%]">
              <span className={`text-[10px] text-gray-400 mb-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                {m.role === 'user' ? '사용자' : 'coach (봄비)'}
              </span>
              <div
                className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-white text-gray-800 rounded-tl-xs border border-gray-200'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-xs prose-gray max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {streaming && streamText && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 text-xs">
              🌱
            </div>
            <div className="flex flex-col max-w-[85%]">
              <span className="text-[10px] text-gray-400 mb-1">coach (봄비)</span>
              <div className="bg-white border border-gray-200 rounded-[16px] rounded-tl-xs px-4 py-3 text-xs text-gray-800">
                <div className="prose prose-xs prose-gray max-w-none">
                  <ReactMarkdown>{streamText}</ReactMarkdown>
                </div>
                <span className="inline-block w-1.5 h-3.5 bg-blue-600 animate-pulse ml-1 rounded-xs" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mention pills */}
      <div className="px-4 py-1.5 bg-white border-t border-gray-100 flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-gray-400 mr-1">멘션:</span>
        <button
          onClick={() => insertMention('@coach')}
          className="px-3 min-h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold hover:bg-blue-100 transition-colors"
        >
          @coach
        </button>
        <button
          onClick={() => insertMention('@creator')}
          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold hover:bg-gray-200 transition-colors"
        >
          @creator
        </button>
      </div>

      {/* Input box */}
      <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2 items-end bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-300 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="메시지를 입력하세요... (Enter로 전송)"
            rows={2}
            className="flex-1 bg-transparent text-xs resize-none focus:outline-none px-2 py-1 text-gray-800 placeholder-gray-400 leading-relaxed"
          />

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Mic button */}
            <button
              onClick={toggleSpeech}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
              title={isRecording ? '음성 녹음 중지' : '음성으로 말하기'}
            >
              {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            {/* Send button */}
            <button
              onClick={send}
              disabled={!input.trim() || loading || streaming}
              className="w-10 h-10 rounded-[12px] bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading || streaming ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
