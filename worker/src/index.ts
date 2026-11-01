// Pibi AI 프록시 Worker.
// - Firebase ID 토큰을 검증 (로그인한 사용자만 호출 가능 → Groq 키 남용 방지)
// - Groq Chat Completions API를 호출해 결과를 그대로 전달
// - 개인 데이터에는 접근하지 않음 (데이터 접근은 Firestore 보안 규칙이 담당)
import { jwtVerify, createRemoteJWKSet } from 'jose'

interface Env {
  GROQ_API_KEY: string
  GROQ_MODEL?: string
  FIREBASE_PROJECT_ID: string
  ALLOWED_ORIGIN?: string
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(data: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  })
}

/** Firebase ID 토큰 검증 → uid 반환 (실패 시 null) */
async function verifyToken(req: Request, env: Env): Promise<string | null> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    })
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

function validMessages(messages: unknown): messages is ChatMessage[] {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 21 &&
    messages.every(
      (m) =>
        m &&
        ['user', 'assistant', 'system'].includes(m.role) &&
        typeof m.content === 'string' &&
        m.content.length > 0 &&
        m.content.length <= 20000
    )
  )
}

async function callGroq(
  env: Env,
  body: Record<string, unknown>
): Promise<Response> {
  if (!env.GROQ_API_KEY) {
    return json({ error: 'GROQ_API_KEY not set' }, 500, env)
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
      ...body,
    }),
  })
  return res
}

async function handleChat(req: Request, env: Env): Promise<Response> {
  const uid = await verifyToken(req, env)
  if (!uid) return json({ error: 'unauthorized' }, 401, env)

  let body: { system?: unknown; messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400, env)
  }
  const { system, messages } = body
  if (typeof system !== 'string' || system.length === 0 || system.length > 30000)
    return json({ error: 'invalid system prompt' }, 400, env)
  if (!validMessages(messages)) return json({ error: 'invalid messages' }, 400, env)

  const groqRes = await callGroq(env, {
    messages: [{ role: 'system', content: system }, ...messages],
    stream: true,
    max_tokens: 8192,
  })
  if (!groqRes.ok || !groqRes.body) {
    const errText = await groqRes.text().catch(() => '')
    return json({ error: `Groq 오류 (${groqRes.status}) ${errText.slice(0, 200)}` }, 502, env)
  }

  // Groq SSE → 프론트가 기대하는 {text}/{done} 포맷으로 변환
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            const data = t.slice(5).trim()
            if (!data || data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const text: string = parsed.choices?.[0]?.delta?.content ?? ''
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            } catch {
              // 부분 JSON 청크는 무시
            }
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...corsHeaders(env) },
  })
}

async function handleComplete(req: Request, env: Env): Promise<Response> {
  const uid = await verifyToken(req, env)
  if (!uid) return json({ error: 'unauthorized' }, 401, env)

  let body: { system?: unknown; user?: unknown; max_tokens?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400, env)
  }
  const { system, user, max_tokens } = body
  if (typeof system !== 'string' || system.length === 0 || system.length > 10000)
    return json({ error: 'invalid system prompt' }, 400, env)
  if (typeof user !== 'string' || user.length === 0 || user.length > 500000)
    return json({ error: 'invalid user prompt' }, 400, env)
  const maxTokens =
    typeof max_tokens === 'number' && max_tokens > 0 && max_tokens <= 8192 ? Math.floor(max_tokens) : 1024

  const groqRes = await callGroq(env, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
  })
  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => '')
    return json({ error: `Groq 오류 (${groqRes.status}) ${errText.slice(0, 200)}` }, 502, env)
  }
  const data = (await groqRes.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  return json({ text }, 200, env)
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }
    if (req.method === 'POST' && url.pathname === '/chat') return handleChat(req, env)
    if (req.method === 'POST' && url.pathname === '/complete') return handleComplete(req, env)
    return json({ error: 'not found' }, 404, env)
  },
}
