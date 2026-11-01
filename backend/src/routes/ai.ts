import { Hono } from 'hono'
import Groq from 'groq-sdk'
import { artifactsDb, chatDb, inspectionsDb, stickyNotesDb, vibeRequestsDb, projectBelongsToUser } from '../db.js'
import type { AppEnv } from '../auth.js'

const app = new Hono<AppEnv>()

const getGroq = () => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')
  return new Groq({ apiKey })
}

const STEP_SYSTEM_PROMPTS: Record<number, string> = {
  0: `당신은 pibi의 다정하고 친절한 AI 코치 '봄비'입니다.
대화 상대는 개발 지식이 전혀 없는 일반인이자 바이브코딩(Vibe Coding)을 처음 시작하는 사용자입니다.
전문 용어나 어려운 기술 단어 대신, 일상적이고 알기 쉬운 말로 용기를 북돋아주며 아이디어를 끌어내주세요.

이 단계는 [1단계: AI 서비스 브레인스토밍]입니다.
사용자가 만들고 싶은 앱/서비스 아이디어를 자유롭게 말할 수 있도록 따뜻하게 안내하세요.
대화 중 나온 핵심 내용(문제 정의, 타겟 사용자, 핵심 해결책, 차별점)을 모아 스티커 메모나 구조화된 정리로 도와줍니다.
결과를 정리할 때는 반드시 \`\`\`json ... \`\`\` 블록으로 다음 구조를 포함해주세요:
{
  "service_name": "서비스 이름",
  "problem": "해결하려는 일상의 불편함",
  "target_users": "타겟 사용자",
  "core_features": ["핵심 기능 1", "핵심 기능 2", "핵심 기능 3"],
  "differentiator": "우리만의 특별한 점",
  "notes": [
    {"content": "문제정의 : ...", "color": "#bbf7d0"},
    {"content": "핵심기능 : ...", "color": "#fef08a"},
    {"content": "해결방안 : ...", "color": "#bfdbfe"}
  ]
}
답변은 친근하고 다정한 한국어로 해주세요.`,

  1: `당신은 pibi의 다정하고 친절한 AI 코치 '봄비'입니다.
사용자는 비개발자입니다. 브레인스토밍 아이디어를 바탕으로 [2단계: AI 서비스 파이프라인 기획]을 작성합니다.
초보자도 한눈에 이해할 수 있게 서비스의 작동 흐름과 시연 범위를 명확히 정리해주세요.
기획서는 반드시 \`\`\`markdown ... \`\`\` 블록으로 감싸주세요.
기획서에는 다음 내용이 직관적인 소제목과 함께 포함되어야 합니다:
# 1. 시연 범위 분리
- 당일 시연 (최소 기능 MVP): 사용자가 실제로 볼 수 있는 핵심 화면 및 시나리오
- 추후 확장 기능: 나중에 추가할 부가 기능
# 2. 서비스 데이터 흐름
- 사용자의 행동 -> AI 또는 시스템 처리 -> 화면 결과 표시
# 3. 예외 및 안내 처리
- 입력 오류나 실패 시 친절한 안내 메시지
답변은 알기 쉬운 한국어로 해주세요.`,

  2: `당신은 pibi의 다정하고 친절한 AI 코치 '봄비'입니다.
비개발자 사용자를 위한 [3단계: 화면 설계]를 도와줍니다.
사용자가 만들려는 앱의 실제 화면 구조(헤더, 본문 카드, 버튼, 폼 등)를 직관적으로 설명하세요.
각 화면의 구성 요소를 \`\`\`json ... \`\`\` 블록으로 다음 구조로 출력하세요:
{
  "screens": [
    {
      "id": "main",
      "name": "메인 화면",
      "layout": "모바일/웹 반응형",
      "components": ["상단 헤더(제목, 상태)", "중앙 안내 박스", "핵심 액션 버튼", "대기열/결과 목록"],
      "primaryColor": "#1e293b",
      "accentColor": "#3b82f6"
    }
  ]
}
답변은 친절한 한국어로 해주세요.`,

  3: `당신은 pibi의 다정하고 친절한 바이브코딩 AI 코치 '봄비'입니다.
사용자는 개발자가 아닌 일반인입니다! 사용자가 일상 언어로 "이 버튼 파란색으로 바꿔줘", "QR 스캔 화면에 학생 이름도 나오게 해줘"라고 말하면,
복잡한 기술 설명 없이 요구사항을 100% 반영한 실제 동작하는 단일 HTML 웹앱을 즉시 만들어주세요.

[규칙]
1. 반드시 단일 HTML 파일로 작성하고 \`\`\`html ... \`\`\` 블록으로 감싸세요.
2. 외부 빌드 도구 없이 브라우저에서 바로 동작해야 하므로 최신 CDN을 활용하세요:
   - Tailwind CSS: <script src="https://cdn.tailwindcss.com"></script>
   - Lucide Icons (선택): <script src="https://unpkg.com/lucide@latest"></script>
3. 실제 인터랙션(버튼 클릭, 폼 입력, 탭 전환, 모달 열기/닫기, 시뮬레이션 동작)이 자바스크립트로 부드럽게 실제로 작동해야 합니다.
4. 디자인은 pibi처럼 깔끔하고 세련된 모던 UI(둥근 카드, 부드러운 그림자, 파스텔 & 블루 포인트 컬러)로 만들어주세요.
답변은 "네! 요청하신 내용을 반영하여 코드를 업데이트했습니다 ✨"와 함께 친절하게 안내해주세요.`,
}

type Message = { role: 'user' | 'assistant'; content: string }

app.post('/chat', async (c) => {
  const body = await c.req.json<{
    project_id: string
    step: number
    message: string
    history?: Message[]
    context?: Record<string, string>
  }>()

  const { project_id, step, message, history = [], context = {} } = body
  if (typeof project_id !== 'string' || !projectBelongsToUser(project_id, c.get('uid'))) return c.json({ error: 'project not found' }, 404)
  if (!Number.isInteger(step) || step < 0 || step > 3 || typeof message !== 'string' || !message.trim() || message.length > 20000)
    return c.json({ error: 'invalid chat payload' }, 400)
  if (!Array.isArray(history) || history.length > 20 || history.some((m) =>
      !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 20000))
    return c.json({ error: 'invalid chat history' }, 400)

  // Build system prompt
  let systemPrompt = STEP_SYSTEM_PROMPTS[step] ?? STEP_SYSTEM_PROMPTS[0]

  // Inject previous step artifacts as context
  if (step > 0 && context) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `[${k}]\n${v}`)
      .join('\n\n')
    if (contextStr) {
      systemPrompt += `\n\n## 이전 단계 산출물\n${contextStr}`
    }
  }

  // Save user message
  chatDb.add({ project_id, step, role: 'user', content: message })

  // If in step 3 (dev), save to vibe requests history!
  if (step === 3) {
    vibeRequestsDb.add({ project_id, prompt: message, status: 'completed' })
  }

  try {
    const groq = getGroq()

    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

    const stream = await groq.chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 8192,
    })

    // Stream response
    const encoder = new TextEncoder()
    let fullContent = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              fullContent += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          // Save assistant message
          chatDb.add({ project_id, step, role: 'assistant', content: fullContent })

          // Auto-extract and save artifact if found
          const htmlMatch = fullContent.match(/```html\r?\n([\s\S]*?)```/) || (step === 3 ? fullContent.match(/```(?:xml|htm)?\r?\n([\s\S]*?)```/) : null)
          const jsonMatch = fullContent.match(/```json\r?\n([\s\S]*?)```/)
          const mdMatch = fullContent.match(/```(?:markdown|md)\r?\n([\s\S]*?)```/)

          if (htmlMatch && (htmlMatch[1].includes('<') || step === 3)) {
            artifactsDb.upsert({ project_id, step, type: 'html', content: htmlMatch[1].trim() })
          }
          if (jsonMatch) {
            artifactsDb.upsert({ project_id, step, type: 'json', content: jsonMatch[1].trim() })
            // If in step 0 and contains notes array, auto create sticky notes!
            try {
              const parsed = JSON.parse(jsonMatch[1])
              if (Array.isArray(parsed.notes)) {
                let offset = 40
                for (const n of parsed.notes) {
                  stickyNotesDb.create({
                    project_id,
                    content: n.content || n.title || JSON.stringify(n),
                    color: n.color || '#fef08a',
                    x: 60 + offset,
                    y: 60 + offset,
                  })
                  offset += 50
                }
              }
            } catch {
              // ignore json parse error
            }
          }
          if (mdMatch) {
            artifactsDb.upsert({ project_id, step, type: 'markdown', content: mdMatch[1].trim() })
          } else if (step === 1 && fullContent.length > 50 && !jsonMatch) {
            artifactsDb.upsert({ project_id, step, type: 'markdown', content: fullContent.trim() })
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (err) {
          console.error('Stream processing error:', err)
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('AI chat error:', err)
    const errMsg = err instanceof Error ? err.message : 'AI 오류가 발생했습니다'
    return c.json({ error: errMsg }, 500)
  }
})

// Generate initial AI prompt for each step
app.post('/init', async (c) => {
  const body = await c.req.json<{
    project_id: string
    step: number
    project_name: string
    context?: Record<string, string>
  }>()

  const { step, project_name, context = {} } = body
  if (typeof body.project_id !== 'string' || !projectBelongsToUser(body.project_id, c.get('uid')))
    return c.json({ error: 'project not found' }, 404)

  const initMessages: Record<number, string> = {
    0: `안녕하세요! 저는 AI 코치 봄비예요 🌱\n"${project_name}" 프로젝트를 멋지게 만들어봐요!\n\n일상에서 겪었던 불편한 점이나 "이런 서비스가 있으면 좋겠다" 싶은 생각이 있나요? 아주 작은 아이디어라도 좋으니 편하게 이야기해주세요!`,
    1: `브레인스토밍 내용을 바탕으로 상세 기획서를 정리해볼게요!\n우선 당일 시연할 핵심 기능과 사용자의 이용 순서를 알기 쉽게 설계해드릴게요. 추가하고 싶은 조건이 있다면 언제든 말씀해주세요!`,
    2: `이제 화면 디자인 단계입니다!\n사용자가 앱에 접속했을 때 보게 될 첫 화면과 주요 버튼들을 구상해봤어요. 색상이나 레이아웃에서 마음에 드는 스타일이 있으신가요?`,
    3: `이제 실제로 움직이는 웹앱을 만들 차례예요! 💻\n"이 버튼 색 바꿔줘", "학생 목록 추가해줘"처럼 평소 말하듯 편하게 요청하시면 실시간으로 코드를 만들어 바로 미리보기에 띄워드릴게요!`,
  }

  let initMsg = initMessages[step] ?? initMessages[0]
  if (context && Object.keys(context).length > 0 && step > 0) {
    initMsg += '\n\n(이전 단계 내용을 바탕으로 준비를 마쳤어요 ✅)'
  }

  return c.json({ message: initMsg })
})

// AI 사전 점검 (Step Inspection)
app.post('/inspect', async (c) => {
  const body = await c.req.json<{
    project_id: string
    step: number
    content?: string
    notes?: string[]
  }>()

  const { project_id, step, content = '', notes = [] } = body
  if (typeof project_id !== 'string' || !projectBelongsToUser(project_id, c.get('uid'))) return c.json({ error: 'project not found' }, 404)
  if (!Number.isInteger(step) || step < 0 || step > 3 || typeof content !== 'string' || content.length > 500000 ||
      !Array.isArray(notes) || notes.length > 100 || notes.some((note) => typeof note !== 'string' || note.length > 2000))
    return c.json({ error: 'invalid inspection payload' }, 400)

  try {
    const groq = getGroq()
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

    const stepNames = ['AI 서비스 브레인스토밍', 'AI 서비스 파이프라인 기획', '화면 설계', 'PoC 개발']
    const stepName = stepNames[step] || '기획'

    const userPrompt = `다음은 비개발자가 작성 중인 [${stepName}] 단계의 작업 내용입니다:
${content ? `[작업 산출물]\n${content}\n` : ''}
${notes.length > 0 ? `[스티커 메모 내용들]\n${notes.join('\n')}\n` : ''}

이 내용을 평가하고, 비개발자 사용자가 쉽게 보완할 수 있는 실천 조언을 제공해주세요.
반드시 아래 JSON 형식으로만 출력하세요:
\`\`\`json
{
  "score": 75,
  "status": "needs_improvement",
  "feedback": [
    "구체적인 문제 정의와 해결 단서가 좋습니다.",
    "예외 상황(오류 발생 시 안내 문구)을 보완하면 완성도가 더욱 높아집니다.",
    "실제 시연 시 보여줄 핵심 동작 1가지를 명확히 좁혀보세요."
  ]
}
\`\`\`
점수는 30점에서 95점 사이로 객관적으로 매겨주세요 (status는 80점 이상이면 "good", 미만이면 "needs_improvement").
피드백 문장은 2~3개로 비개발자가 즉시 이해할 수 있는 친절하고 구체적인 문장으로 작성하세요.`

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '당신은 해커톤 심사위원이자 친절한 AI 코치입니다. JSON 포맷만 출력하세요.' },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
    })

    const ans = completion.choices[0]?.message?.content || ''
    const match = ans.match(/```json\r?\n([\s\S]*?)```/) || ans.match(/\{[\s\S]*\}/)
    let parsed = {
      score: 72,
      status: 'needs_improvement',
      feedback: [
        '핵심 문제와 해결 아이디어가 잘 제시되었습니다.',
        '실제 사용자의 행동 시나리오를 조금 더 구체화해보세요.',
        '시연할 최소 기능 범위를 명확히 좁히면 개발이 훨씬 쉬워집니다.'
      ],
    }

    if (match) {
      try {
        const p = JSON.parse(match[1] || match[0])
        if (p.score && Array.isArray(p.feedback)) {
          parsed = p
        }
      } catch {}
    }

    // Save to DB
    const saved = inspectionsDb.upsert(project_id, step, parsed.score, parsed.status, parsed.feedback)

    return c.json({
      ...saved,
      feedback: parsed.feedback,
    })
  } catch (err) {
    console.error('Inspection error:', err)
    // Fallback default
    const saved = inspectionsDb.upsert(project_id, step, 70, 'needs_improvement', [
      '문제 정의가 잘 드러나 있습니다.',
      '예외 처리와 사용자 피드백 문구를 보완해보세요.',
      '핵심 기능의 우선순위를 명확히 정하면 좋습니다.'
    ])
    return c.json({
      ...saved,
      feedback: JSON.parse(saved.feedback),
    })
  }
})

// AI 스티커 노트 추천 생성
app.post('/suggest-notes', async (c) => {
  const body = await c.req.json<{
    project_id: string
    idea?: string
  }>()

  const { project_id, idea = '서비스 아이디어' } = body
  if (typeof project_id !== 'string' || !projectBelongsToUser(project_id, c.get('uid'))) return c.json({ error: 'project not found' }, 404)
  if (typeof idea !== 'string' || idea.length > 5000) return c.json({ error: 'invalid idea' }, 400)

  try {
    const groq = getGroq()
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '당신은 브레인스토밍 도우미입니다. JSON 형식으로만 답변하세요.' },
        {
          role: 'user',
          content: `아이디어: "${idea}". 이와 관련된 브레인스토밍 포스트잇 메모 3개를 작성해주세요.
\`\`\`json
[
  {"content": "문제정의 : ...", "color": "#fef08a"},
  {"content": "해결책 : ...", "color": "#bbf7d0"},
  {"content": "핵심기능 : ...", "color": "#bfdbfe"}
]
\`\`\``
        }
      ],
      max_tokens: 1024,
    })

    const ans = completion.choices[0]?.message?.content || ''
    const match = ans.match(/```json\r?\n([\s\S]*?)```/) || ans.match(/\[[\s\S]*\]/)
    let notes = [
      { content: `문제정의 : ${idea} 관련 불편함 해소`, color: '#fef08a' },
      { content: '핵심기능 : 사용자 친화적 원클릭 인터랙션', color: '#bbf7d0' },
      { content: '해결방안 : AI 연동 자동화 프로세스', color: '#bfdbfe' },
    ]

    if (match) {
      try {
        const p = JSON.parse(match[1] || match[0])
        if (Array.isArray(p)) notes = p
      } catch {}
    }

    const created = []
    let offset = 40
    for (const n of notes) {
      const row = stickyNotesDb.create({
        project_id,
        content: n.content,
        color: n.color || '#fef08a',
        x: 80 + offset,
        y: 80 + offset,
      })
      created.push(row)
      offset += 60
    }

    return c.json(created)
  } catch (err) {
    console.error('Suggest notes error:', err)
    return c.json([], 500)
  }
})

export default app
