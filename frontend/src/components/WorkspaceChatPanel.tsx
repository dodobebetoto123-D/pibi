import { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, query, where } from 'firebase/firestore'
import { firestore } from '../auth/firebase'
import { useAuth } from '../auth/AuthContext'
import type { ChatMessage, StepArtifact } from '../types'
import CoachChatPanel from './CoachChatPanel'

interface Props {
  projectId: string
  projectName: string
  step: number
  history: ChatMessage[]
  allArtifacts: StepArtifact[]
  onArtifactUpdate?: () => void
}

interface TeamMessage { id: string; content: string; sender: string; sender_uid: string; created_at: string }

function TeamChat({ projectId }: { projectId: string }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!firestore) { setError('Firestore가 설정되지 않았습니다.'); return }
    return onSnapshot(query(collection(firestore, 'projects', projectId, 'chat'), where('step', '==', -1)), (snapshot) => {
      const rows = snapshot.docs.map((item) => {
        const data = item.data()
        return { id: item.id, content: String(data.content || ''), sender: String(data.sender || ''), sender_uid: String(data.sender_uid || ''), created_at: String(data.created_at || '') }
      }).sort((a, b) => a.created_at.localeCompare(b.created_at))
      setMessages(rows); setError('')
    }, (err) => setError(err.message))
  }, [projectId])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || !user || !firestore || sending) return
    setSending(true); setError('')
    try {
      await addDoc(collection(firestore, 'projects', projectId, 'chat'), { step: -1, role: 'user', content, sender: user.displayName || user.email || '팀원', sender_uid: user.uid, created_at: new Date().toISOString() })
      setInput('')
    } catch (err) { setError(err instanceof Error ? err.message : '메시지를 보내지 못했습니다.') }
    finally { setSending(false) }
  }

  return <div className="flex h-full min-h-0 flex-col border-l border-gray-200 bg-white">
    <div className="flex-1 space-y-3 overflow-auto p-4">{messages.length === 0 && <p className="text-sm text-gray-500">팀원과 프로젝트에 관해 대화해 보세요.</p>}{messages.map((message) => <div key={message.id} className={`rounded-xl p-3 text-sm ${message.sender_uid === user?.uid ? 'bg-blue-50' : 'bg-gray-50'}`}><p className="text-xs font-semibold text-gray-600">{message.sender}</p><p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p><time className="mt-1 block text-[10px] text-gray-400">{message.created_at ? new Date(message.created_at).toLocaleString() : ''}</time></div>)}</div>
    {error && <p role="alert" className="px-4 text-xs text-red-700">{error}</p>}
    <form onSubmit={(event) => void send(event)} className="flex gap-2 border-t p-3"><input aria-label="팀 메시지" value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" placeholder="팀 메시지 입력" /><button disabled={sending || !input.trim()} className="rounded-xl bg-blue-600 px-3 text-sm text-white disabled:opacity-50">전송</button></form>
  </div>
}

export default function WorkspaceChatPanel(props: Props) {
  const [tab, setTab] = useState<'coach' | 'team'>('coach')
  return <div className="flex h-full min-h-0 flex-col"><div className="flex border-b bg-white p-2"><button aria-pressed={tab === 'coach'} onClick={() => setTab('coach')} className={`flex-1 rounded-lg p-2 text-xs ${tab === 'coach' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-500'}`}>AI 코치</button><button aria-pressed={tab === 'team'} onClick={() => setTab('team')} className={`flex-1 rounded-lg p-2 text-xs ${tab === 'team' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-500'}`}>팀 채팅</button></div><div className="min-h-0 flex-1">{tab === 'coach' ? <CoachChatPanel {...props} /> : <TeamChat projectId={props.projectId} />}</div></div>
}
