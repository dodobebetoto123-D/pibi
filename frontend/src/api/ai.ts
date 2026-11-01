// Cloudflare Worker(AI 프록시) 클라이언트.
// GROQ_API_KEY는 Worker 쪽에만 있고, 여기는 Firebase ID 토큰으로 인증한다.
import { firebaseAuth } from '../auth/firebase'

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string | undefined

function workerUrl(): string {
  if (!WORKER_URL) throw new Error('VITE_WORKER_URL이 설정되지 않았습니다 (.env.local 확인)')
  return WORKER_URL.replace(/\/$/, '')
}

async function getToken(): Promise<string> {
  const token = await firebaseAuth?.currentUser?.getIdToken()
  if (!token) throw new Error('로그인이 필요합니다')
  return token
}

export interface WorkerMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** 스트리밍 채팅 — SSE(data: {"text"})를 파싱해 onChunk로 전달 */
export async function workerChat(
  system: string,
  messages: WorkerMessage[],
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const token = await getToken()
  const res = await fetch(`${workerUrl()}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ system, messages }),
  })
  if (!res.ok) {
    const errorJson = await res.json().catch(() => null)
    throw new Error(errorJson?.error || `AI 오류 (${res.status})`)
  }
  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      const parsed = JSON.parse(payload)
      if (parsed.text) onChunk(parsed.text)
      if (parsed.done) onDone()
    }
  }
}

/** 비스트리밍 완성 — 검사/추천용 */
export async function workerComplete(system: string, user: string, maxTokens = 1024): Promise<string> {
  const token = await getToken()
  const res = await fetch(`${workerUrl()}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ system, user, max_tokens: maxTokens }),
  })
  if (!res.ok) {
    const errorJson = await res.json().catch(() => null)
    throw new Error(errorJson?.error || `AI 오류 (${res.status})`)
  }
  const data = await res.json()
  return (data.text as string) ?? ''
}
