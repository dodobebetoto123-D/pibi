// Firestore 데이터 레이어 — 기존 backend/src/db.ts의 SQLite 로직을 대체.
// 소유권 검사는 firestore.rules에서 강제, 여기는 편의용 클라이언트.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { firestore } from '../auth/firebase'
import type {
  Project,
  StepArtifact,
  ChatMessage,
  KanbanCard,
  StickyNote,
  VibeRequest,
  StepInspection,
} from '../types'

function db() {
  if (!firestore) throw new Error('Firestore가 초기화되지 않았습니다')
  return firestore
}

const now = () => new Date().toISOString()
const newId = () => crypto.randomUUID()

function sub(projectId: string, name: string) {
  return collection(db(), 'projects', projectId, name)
}

async function deleteSubcollection(projectId: string, name: string) {
  const snap = await getDocs(sub(projectId, name))
  if (snap.empty) return
  const batch = writeBatch(db())
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

export const store = {
  projects: {
    async list(uid: string): Promise<Project[]> {
      const snap = await getDocs(query(collection(db(), 'projects'), where('owner_uid', '==', uid)))
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project)
      rows.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      return rows
    },
    async get(id: string): Promise<Project> {
      const snap = await getDoc(doc(db(), 'projects', id))
      if (!snap.exists()) throw new Error('프로젝트를 찾을 수 없습니다')
      return { id: snap.id, ...snap.data() } as Project
    },
    async create(
      uid: string,
      data: { name: string; type?: string; description?: string }
    ): Promise<Project> {
      const id = newId()
      const row = {
        name: data.name,
        type: data.type ?? 'web',
        description: data.description ?? '',
        status: 'planned',
        current_step: 0,
        owner_uid: uid,
        created_at: now(),
        updated_at: now(),
      }
      await setDoc(doc(db(), 'projects', id), row)
      return { id, ...row } as Project
    },
    async update(id: string, data: Partial<Project>): Promise<Project> {
      const { id: _drop, ...rest } = data
      await updateDoc(doc(db(), 'projects', id), { ...rest, updated_at: now() })
      return this.get(id)
    },
    async remove(id: string): Promise<void> {
      for (const name of ['artifacts', 'chat', 'kanban', 'notes', 'requests', 'inspections']) {
        await deleteSubcollection(id, name)
      }
      await deleteDoc(doc(db(), 'projects', id))
    },
  },

  artifacts: {
    async list(projectId: string): Promise<StepArtifact[]> {
      const snap = await getDocs(sub(projectId, 'artifacts'))
      return snap.docs.map((d) => ({ id: d.id, project_id: projectId, ...d.data() }) as StepArtifact)
    },
    async byStep(projectId: string, step: number): Promise<StepArtifact[]> {
      const snap = await getDocs(query(sub(projectId, 'artifacts'), where('step', '==', step)))
      return snap.docs.map((d) => ({ id: d.id, project_id: projectId, ...d.data() }) as StepArtifact)
    },
    async upsert(projectId: string, step: number, type: string, content: string): Promise<StepArtifact> {
      const id = `${step}_${type}`
      const ref = doc(db(), 'projects', projectId, 'artifacts', id)
      const existing = await getDoc(ref)
      const row = {
        project_id: projectId,
        step,
        type,
        content,
        created_at: existing.exists() ? (existing.data().created_at as string) : now(),
        updated_at: now(),
      }
      await setDoc(ref, row, { merge: true })
      return { id, ...row } as StepArtifact
    },
  },

  chat: {
    async history(projectId: string, step: number): Promise<ChatMessage[]> {
      const snap = await getDocs(query(sub(projectId, 'chat'), where('step', '==', step)))
      const rows = snap.docs.map((d) => ({ id: d.id, project_id: projectId, ...d.data() }) as ChatMessage)
      rows.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
      return rows
    },
    async add(
      projectId: string,
      data: { step: number; role: 'user' | 'assistant'; content: string }
    ): Promise<ChatMessage> {
      const id = newId()
      const row = { project_id: projectId, step: data.step, role: data.role, content: data.content, created_at: now() }
      await setDoc(doc(db(), 'projects', projectId, 'chat', id), row)
      return { id, ...row } as ChatMessage
    },
  },

  kanban: {
    async list(projectId: string): Promise<KanbanCard[]> {
      const snap = await getDocs(sub(projectId, 'kanban'))
      const rows = snap.docs.map((d) => ({ id: d.id, project_id: projectId, ...d.data() }) as KanbanCard)
      rows.sort((a, b) => (a.position || 0) - (b.position || 0))
      return rows
    },
    async create(projectId: string, data: Partial<KanbanCard>): Promise<KanbanCard> {
      const id = newId()
      const row = {
        project_id: projectId,
        column_id: data.column_id ?? 'todo',
        title: data.title ?? '새 카드',
        description: data.description ?? '',
        color: data.color ?? '#fef08a',
        position: data.position ?? 0,
        created_at: now(),
        updated_at: now(),
      }
      await setDoc(doc(db(), 'projects', projectId, 'kanban', id), row)
      return { id, ...row } as KanbanCard
    },
    async update(projectId: string, cardId: string, data: Partial<KanbanCard>): Promise<KanbanCard> {
      const { id: _drop, project_id: _drop2, ...rest } = data
      await updateDoc(doc(db(), 'projects', projectId, 'kanban', cardId), { ...rest, updated_at: now() })
      const snap = await getDoc(doc(db(), 'projects', projectId, 'kanban', cardId))
      return { id: snap.id, project_id: projectId, ...snap.data() } as KanbanCard
    },
    async remove(projectId: string, cardId: string): Promise<void> {
      await deleteDoc(doc(db(), 'projects', projectId, 'kanban', cardId))
    },
  },

  notes: {
    async list(projectId: string): Promise<StickyNote[]> {
      const snap = await getDocs(sub(projectId, 'notes'))
      return snap.docs.map((d) => ({ id: d.id, project_id: projectId, ...d.data() }) as StickyNote)
    },
    async create(
      projectId: string,
      data: { content: string; color?: string; x?: number; y?: number }
    ): Promise<StickyNote> {
      const id = newId()
      const row = {
        project_id: projectId,
        content: data.content,
        color: data.color ?? '#fef08a',
        x: data.x ?? 50,
        y: data.y ?? 50,
        created_at: now(),
        updated_at: now(),
      }
      await setDoc(doc(db(), 'projects', projectId, 'notes', id), row)
      return { id, ...row } as StickyNote
    },
    async update(projectId: string, noteId: string, data: Partial<StickyNote>): Promise<StickyNote> {
      const { id: _drop, project_id: _drop2, ...rest } = data
      await updateDoc(doc(db(), 'projects', projectId, 'notes', noteId), { ...rest, updated_at: now() })
      const snap = await getDoc(doc(db(), 'projects', projectId, 'notes', noteId))
      return { id: snap.id, project_id: projectId, ...snap.data() } as StickyNote
    },
    async remove(projectId: string, noteId: string): Promise<void> {
      await deleteDoc(doc(db(), 'projects', projectId, 'notes', noteId))
    },
  },

  vibeRequests: {
    async list(projectId: string): Promise<VibeRequest[]> {
      const snap = await getDocs(sub(projectId, 'requests'))
      const rows = snap.docs.map((d) => ({ id: d.id, project_id: projectId, ...d.data() }) as VibeRequest)
      rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      return rows
    },
    async add(projectId: string, data: { prompt: string; status?: string }): Promise<VibeRequest> {
      const id = newId()
      const row = { project_id: projectId, prompt: data.prompt, status: data.status ?? 'completed', created_at: now() }
      await setDoc(doc(db(), 'projects', projectId, 'requests', id), row)
      return { id, ...row } as VibeRequest
    },
  },

  inspections: {
    async get(projectId: string, step: number): Promise<StepInspection | null> {
      const snap = await getDoc(doc(db(), 'projects', projectId, 'inspections', String(step)))
      if (!snap.exists()) return null
      const data = snap.data()
      return {
        id: snap.id,
        project_id: projectId,
        step,
        score: data.score as number,
        status: data.status as StepInspection['status'],
        feedback: data.feedback as string[],
        updated_at: data.updated_at as string,
      }
    },
    async upsert(
      projectId: string,
      step: number,
      score: number,
      status: string,
      feedback: string[]
    ): Promise<StepInspection> {
      const row = { project_id: projectId, step, score, status, feedback, updated_at: now() }
      await setDoc(doc(db(), 'projects', projectId, 'inspections', String(step)), row, { merge: true })
      return { id: String(step), ...row, status: status as StepInspection['status'] }
    },
  },
}
