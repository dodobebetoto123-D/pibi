// API 레이어 — Firestore 직접 접근 + Cloudflare Worker(AI).
// 외부에서 보는 `api` 객체 모양은 기존(백엔드 REST 시절)과 동일해서
// 컴포넌트 코드는 수정 없이 그대로 동작한다.
import { firebaseAuth } from '../auth/firebase'
import { store } from '../lib/store'
import { workerChat, workerComplete } from './ai'
import { buildSystemPrompt, buildInitMessage, buildInspectPrompt, buildSuggestPrompt } from '../lib/prompts'
import { extractArtifacts } from '../lib/extractArtifacts'
import type {
  Project,
  StepArtifact,
  ChatMessage,
  KanbanCard,
  StickyNote,
  VibeRequest,
  StepInspection,
} from '../types'

function uid(): string {
  const id = firebaseAuth?.currentUser?.uid
  if (!id) throw new Error('로그인이 필요합니다')
  return id
}

export const api = {
  projects: {
    list: (): Promise<Project[]> => store.projects.list(uid()),
    get: (id: string): Promise<Project> => store.projects.get(id),
    create: (data: { name: string; type?: string; description?: string }): Promise<Project> =>
      store.projects.create(uid(), data),
    update: (id: string, data: Partial<Project>): Promise<Project> => store.projects.update(id, data),
    delete: (id: string): Promise<{ ok: boolean }> => store.projects.remove(id).then(() => ({ ok: true })),
  },

  artifacts: {
    versions: (projectId: string, step: number): Promise<StepArtifact[]> => store.artifacts.versions(projectId, step),
    list: (projectId: string): Promise<StepArtifact[]> => store.artifacts.list(projectId),
    byStep: (projectId: string, step: number): Promise<StepArtifact[]> =>
      store.artifacts.byStep(projectId, step),
    save: (projectId: string, data: { step: number; type: string; content: string }): Promise<StepArtifact> =>
      store.artifacts.upsert(projectId, data.step, data.type, data.content),
  },

  notes: {
    list: (projectId: string): Promise<StickyNote[]> => store.notes.list(projectId),
    create: (projectId: string, data: { content: string; color?: string; x?: number; y?: number }): Promise<StickyNote> =>
      store.notes.create(projectId, data),
    update: (projectId: string, noteId: string, data: Partial<StickyNote>): Promise<StickyNote> =>
      store.notes.update(projectId, noteId, data),
    delete: (projectId: string, noteId: string): Promise<{ ok: boolean }> =>
      store.notes.remove(projectId, noteId).then(() => ({ ok: true })),
    suggest: async (projectId: string, idea?: string): Promise<StickyNote[]> => {
      const { system, user } = buildSuggestPrompt(idea ?? '서비스 아이디어')
      let notes = [
        { content: `문제정의 : ${idea ?? '서비스 아이디어'} 관련 불편함 해소`, color: '#fef08a' },
        { content: '핵심기능 : 사용자 친화적 원클릭 인터랙션', color: '#bbf7d0' },
        { content: '해결방안 : AI 연동 자동화 프로세스', color: '#bfdbfe' },
      ]
      try {
        const text = await workerComplete(system, user, 1024)
        const match = text.match(/```json\r?\n([\s\S]*?)```/) || text.match(/\[[\s\S]*\]/)
        if (match) {
          const p = JSON.parse(match[1] || match[0])
          if (Array.isArray(p)) notes = p
        }
      } catch {
        return []
      }
      const created: StickyNote[] = []
      let offset = 40
      for (const n of notes) {
        created.push(
          await store.notes.create(projectId, {
            content: n.content,
            color: n.color || '#fef08a',
            x: 80 + offset,
            y: 80 + offset,
          })
        )
        offset += 60
      }
      return created
    },
  },

  vibeRequests: {
    list: (projectId: string): Promise<VibeRequest[]> => store.vibeRequests.list(projectId),
    create: (projectId: string, data: { prompt: string; status?: string }): Promise<VibeRequest> =>
      store.vibeRequests.add(projectId, data),
  },

  inspections: {
    get: (projectId: string, step: number): Promise<StepInspection | null> =>
      store.inspections.get(projectId, step),
    inspect: async (data: {
      project_id: string
      step: number
      content?: string
      notes?: string[]
    }): Promise<StepInspection> => {
      const { project_id, step, content = '', notes = [] } = data
      if (!Number.isInteger(step) || step < 0 || step > 3)
        throw new Error('잘못된 단계입니다')
      const { system, user } = buildInspectPrompt(step, content, notes)
      let parsed: { score: number; status: string; feedback: string[] } = {
        score: 72,
        status: 'needs_improvement',
        feedback: [
          '핵심 문제와 해결 아이디어가 잘 제시되었습니다.',
          '실제 사용자의 행동 시나리오를 조금 더 구체화해보세요.',
          '시연할 최소 기능 범위를 명확히 좁히면 개발이 훨씬 쉬워집니다.',
        ],
      }
      try {
        const text = await workerComplete(system, user, 1024)
        const match = text.match(/```json\r?\n([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
        if (match) {
          const p = JSON.parse(match[1] || match[0])
          if (p.score && Array.isArray(p.feedback)) parsed = p
        }
      } catch {
        parsed = {
          score: 70,
          status: 'needs_improvement',
          feedback: [
            '문제 정의가 잘 드러나 있습니다.',
            '예외 처리와 사용자 피드백 문구를 보완해보세요.',
            '핵심 기능의 우선순위를 명확히 정하면 좋습니다.',
          ],
        }
      }
      const saved = await store.inspections.upsert(project_id, step, parsed.score, parsed.status, parsed.feedback)
      return { ...saved, feedback: parsed.feedback }
    },
  },

  chat: {
    history: (projectId: string, step: number): Promise<ChatMessage[]> =>
      store.chat.history(projectId, step),
    save: (projectId: string, data: { step: number; role: 'user' | 'assistant'; content: string }): Promise<ChatMessage> =>
      store.chat.add(projectId, {
        step: data.step,
        role: data.role as 'user' | 'assistant',
        content: data.content,
      }),
  },

  kanban: {
    list: (projectId: string): Promise<KanbanCard[]> => store.kanban.list(projectId),
    create: (projectId: string, data: Partial<KanbanCard>): Promise<KanbanCard> =>
      store.kanban.create(projectId, data),
    update: (projectId: string, cardId: string, data: Partial<KanbanCard>): Promise<KanbanCard> =>
      store.kanban.update(projectId, cardId, data),
    delete: (projectId: string, cardId: string): Promise<{ ok: boolean }> =>
      store.kanban.remove(projectId, cardId).then(() => ({ ok: true })),
  },

  ai: {
    init: async (data: {
      project_id: string
      step: number
      project_name: string
      context?: Record<string, string>
    }): Promise<{ message: string }> => ({
      message: buildInitMessage(data.step, data.project_name, data.context ?? {}),
    }),

    chat: async (
      data: {
        project_id: string
        step: number
        message: string
        history?: { role: 'user' | 'assistant'; content: string }[]
        context?: Record<string, string>
      },
      onChunk: (text: string) => void,
      onDone: () => void
    ): Promise<void> => {
      const { project_id, step, message, history = [], context = {} } = data
      if (!Number.isInteger(step) || step < 0 || step > 3 || !message.trim() || message.length > 20000)
        throw new Error('잘못된 채팅 요청입니다')
      if (!Array.isArray(history) || history.length > 20)
        throw new Error('잘못된 대화 기록입니다')

      // 사용자 메시지 저장 (기존 백엔드와 동일)
      await store.chat.add(project_id, { step, role: 'user', content: message })

      // 3단계(개발)에서는 vibe 요청 기록도 저장
      if (step === 3) {
        await store.vibeRequests.add(project_id, { prompt: message, status: 'completed' })
      }

      const system = buildSystemPrompt(step, context)
      const messages = [...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })), { role: 'user' as const, content: message }]

      let full = ''
      await workerChat(
        system,
        messages,
        (chunk) => {
          full += chunk
          onChunk(chunk)
        },
        async () => {
          // 어시스턴트 메시지 저장
          await store.chat.add(project_id, { step, role: 'assistant', content: full })

          // 산출물 자동 추출·저장
          const { artifacts, notes } = extractArtifacts(full, step)
          for (const a of artifacts) {
            await store.artifacts.upsert(project_id, step, a.type, a.content)
          }
          // 0단계 JSON의 notes 배열 → 스티커 메모 자동 생성
          let offset = 40
          for (const n of notes) {
            await store.notes.create(project_id, {
              content: n.content,
              color: n.color,
              x: 60 + offset,
              y: 60 + offset,
            })
            offset += 50
          }
          onDone()
        }
      )
    },
  },
}
