import type { Project, StepArtifact, ChatMessage, KanbanCard, StickyNote, VibeRequest, StepInspection } from '../types'
import { firebaseAuth } from '../auth/firebase'

const BASE = '/api'

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = await firebaseAuth?.currentUser?.getIdToken()
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as any).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

// Projects
export const api = {
  projects: {
    list: () => req<Project[]>('/projects'),
    get: (id: string) => req<Project>(`/projects/${id}`),
    create: (data: { name: string; type?: string; description?: string }) =>
      req<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Project>) =>
      req<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => req<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  },

  artifacts: {
    list: (projectId: string) => req<StepArtifact[]>(`/projects/${projectId}/artifacts`),
    byStep: (projectId: string, step: number) =>
      req<StepArtifact[]>(`/projects/${projectId}/artifacts/${step}`),
    save: (projectId: string, data: { step: number; type: string; content: string }) =>
      req<StepArtifact>(`/projects/${projectId}/artifacts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  notes: {
    list: (projectId: string) => req<StickyNote[]>(`/projects/${projectId}/notes`),
    create: (projectId: string, data: { content: string; color?: string; x?: number; y?: number }) =>
      req<StickyNote>(`/projects/${projectId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (projectId: string, noteId: string, data: Partial<StickyNote>) =>
      req<StickyNote>(`/projects/${projectId}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, noteId: string) =>
      req<{ ok: boolean }>(`/projects/${projectId}/notes/${noteId}`, { method: 'DELETE' }),
    suggest: (projectId: string, idea?: string) =>
      req<StickyNote[]>('/ai/suggest-notes', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, idea }),
      }),
  },

  vibeRequests: {
    list: (projectId: string) => req<VibeRequest[]>(`/projects/${projectId}/requests`),
    create: (projectId: string, data: { prompt: string; status?: string }) =>
      req<VibeRequest>(`/projects/${projectId}/requests`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  inspections: {
    get: (projectId: string, step: number) => req<StepInspection | null>(`/projects/${projectId}/inspections/${step}`),
    inspect: (data: { project_id: string; step: number; content?: string; notes?: string[] }) =>
      req<StepInspection>('/ai/inspect', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  chat: {
    history: (projectId: string, step: number) =>
      req<ChatMessage[]>(`/projects/${projectId}/chat/${step}`),
    save: (projectId: string, data: { step: number; role: string; content: string }) =>
      req<ChatMessage>(`/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  kanban: {
    list: (projectId: string) => req<KanbanCard[]>(`/projects/${projectId}/kanban`),
    create: (projectId: string, data: Partial<KanbanCard>) =>
      req<KanbanCard>(`/projects/${projectId}/kanban`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (projectId: string, cardId: string, data: Partial<KanbanCard>) =>
      req<KanbanCard>(`/projects/${projectId}/kanban/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, cardId: string) =>
      req<{ ok: boolean }>(`/projects/${projectId}/kanban/${cardId}`, { method: 'DELETE' }),
  },

  ai: {
    init: (data: { project_id: string; step: number; project_name: string; context?: Record<string, string> }) =>
      req<{ message: string }>('/ai/init', { method: 'POST', body: JSON.stringify(data) }),

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
    ) => {
      const token = await firebaseAuth?.currentUser?.getIdToken()
      const res = await fetch(`${BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
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
    },
  },
}
