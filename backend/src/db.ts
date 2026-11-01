// Uses Node.js built-in sqlite module (Node >= 22.5)
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data.db')

export const db = new DatabaseSync(DB_PATH)

// Initialize schema
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'web',
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'planned',
    current_step INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS step_artifacts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS kanban_cards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#fef08a',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sticky_notes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    content TEXT NOT NULL,
    color TEXT DEFAULT '#fef08a',
    x REAL DEFAULT 50,
    y REAL DEFAULT 50,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vibe_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS step_inspections (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'needs_improvement',
    feedback TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`)

const projectColumns = db.prepare('PRAGMA table_info(projects)').all() as { name: string }[]
if (!projectColumns.some((column) => column.name === 'owner_uid')) {
  db.exec('ALTER TABLE projects ADD COLUMN owner_uid TEXT')
}
db.exec('CREATE INDEX IF NOT EXISTS idx_projects_owner_updated ON projects(owner_uid, updated_at DESC)')

export function projectBelongsToUser(projectId: string, ownerUid: string): boolean {
  return !!db.prepare('SELECT 1 FROM projects WHERE id = ? AND owner_uid = ?').get(projectId, ownerUid)
}

export function recordBelongsToProject(
  table: 'sticky_notes' | 'kanban_cards',
  recordId: string,
  projectId: string,
): boolean {
  // Table names are restricted by the TypeScript union above.
  return !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND project_id = ?`).get(recordId, projectId)
}

export function generateId(): string {
  return randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}

// --- Projects ---
export type Project = {
  id: string
  name: string
  type: string
  description: string
  status: 'planned' | 'active' | 'done'
  current_step: number
  created_at: string
  updated_at: string
}

export const projectsDb = {
  list: (ownerUid: string): Project[] => {
    const stmt = db.prepare('SELECT id, name, type, description, status, current_step, created_at, updated_at FROM projects WHERE owner_uid = ? ORDER BY updated_at DESC')
    return stmt.all(ownerUid) as Project[]
  },
  get: (id: string, ownerUid: string): Project | undefined => {
    const stmt = db.prepare('SELECT id, name, type, description, status, current_step, created_at, updated_at FROM projects WHERE id = ? AND owner_uid = ?')
    return stmt.get(id, ownerUid) as Project | undefined
  },
  create: (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>, ownerUid: string): Project => {
    const id = generateId()
    const ts = now()
    db.prepare(
      'INSERT INTO projects (id, name, type, description, status, current_step, created_at, updated_at, owner_uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.name, data.type, data.description, data.status, data.current_step, ts, ts, ownerUid)
    return projectsDb.get(id, ownerUid) as Project
  },
  update: (id: string, data: Partial<Omit<Project, 'id' | 'created_at'>>, ownerUid: string): Project | undefined => {
    const existing = projectsDb.get(id, ownerUid)
    if (!existing) return undefined
    const merged = { ...existing, ...data, updated_at: now() }
    db.prepare(
      'UPDATE projects SET name=?, type=?, description=?, status=?, current_step=?, updated_at=? WHERE id=? AND owner_uid=?'
    ).run(merged.name, merged.type, merged.description, merged.status, merged.current_step, merged.updated_at, id, ownerUid)
    return projectsDb.get(id, ownerUid)
  },
  delete: (id: string, ownerUid: string): void => {
    db.prepare('DELETE FROM projects WHERE id = ? AND owner_uid = ?').run(id, ownerUid)
  },
  claimUnowned: (ownerUid: string): void => {
    db.prepare('UPDATE projects SET owner_uid = ? WHERE owner_uid IS NULL').run(ownerUid)
  },
}

// --- Step Artifacts ---
export type StepArtifact = {
  id: string
  project_id: string
  step: number
  type: string
  content: string
  created_at: string
  updated_at: string
}

export const artifactsDb = {
  list: (projectId: string): StepArtifact[] =>
    db.prepare('SELECT * FROM step_artifacts WHERE project_id = ? ORDER BY step, created_at').all(projectId) as StepArtifact[],
  getByStep: (projectId: string, step: number): StepArtifact[] =>
    db.prepare('SELECT * FROM step_artifacts WHERE project_id = ? AND step = ? ORDER BY created_at DESC').all(projectId, step) as StepArtifact[],
  getLatest: (projectId: string, step: number, type: string): StepArtifact | undefined =>
    db.prepare('SELECT * FROM step_artifacts WHERE project_id = ? AND step = ? AND type = ? ORDER BY created_at DESC LIMIT 1').get(projectId, step, type) as StepArtifact | undefined,
  upsert: (data: Omit<StepArtifact, 'id' | 'created_at' | 'updated_at'>): StepArtifact => {
    const existing = artifactsDb.getLatest(data.project_id, data.step, data.type)
    const ts = now()
    if (existing) {
      db.prepare('UPDATE step_artifacts SET content=?, updated_at=? WHERE id=?').run(data.content, ts, existing.id)
      return db.prepare('SELECT * FROM step_artifacts WHERE id = ?').get(existing.id) as StepArtifact
    }
    const id = generateId()
    db.prepare(
      'INSERT INTO step_artifacts (id, project_id, step, type, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.project_id, data.step, data.type, data.content, ts, ts)
    return db.prepare('SELECT * FROM step_artifacts WHERE id = ?').get(id) as StepArtifact
  },
}

// --- Chat Messages ---
export type ChatMessage = {
  id: string
  project_id: string
  step: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export const chatDb = {
  list: (projectId: string, step: number): ChatMessage[] =>
    db.prepare('SELECT * FROM chat_messages WHERE project_id = ? AND step = ? ORDER BY created_at').all(projectId, step) as ChatMessage[],
  add: (data: Omit<ChatMessage, 'id' | 'created_at'>): ChatMessage => {
    const id = generateId()
    const ts = now()
    db.prepare(
      'INSERT INTO chat_messages (id, project_id, step, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.project_id, data.step, data.role, data.content, ts)
    return db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id) as ChatMessage
  },
}

// --- Kanban ---
export type KanbanCard = {
  id: string
  project_id: string
  column_id: string
  title: string
  description: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export const kanbanDb = {
  list: (projectId: string): KanbanCard[] =>
    db.prepare('SELECT * FROM kanban_cards WHERE project_id = ? ORDER BY column_id, position').all(projectId) as KanbanCard[],
  create: (data: Omit<KanbanCard, 'id' | 'created_at' | 'updated_at'>): KanbanCard => {
    const id = generateId()
    const ts = now()
    db.prepare(
      'INSERT INTO kanban_cards (id, project_id, column_id, title, description, color, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.project_id, data.column_id, data.title, data.description, data.color, data.position, ts, ts)
    return db.prepare('SELECT * FROM kanban_cards WHERE id = ?').get(id) as KanbanCard
  },
  update: (id: string, data: Partial<KanbanCard>): KanbanCard | undefined => {
    const ts = now()
    const existing = db.prepare('SELECT * FROM kanban_cards WHERE id = ?').get(id) as KanbanCard | undefined
    if (!existing) return undefined
    const merged = { ...existing, ...data }
    db.prepare(
      'UPDATE kanban_cards SET column_id=?, title=?, description=?, color=?, position=?, updated_at=? WHERE id=?'
    ).run(merged.column_id, merged.title, merged.description, merged.color, merged.position, ts, id)
    return db.prepare('SELECT * FROM kanban_cards WHERE id = ?').get(id) as KanbanCard
  },
  delete: (id: string): void => {
    db.prepare('DELETE FROM kanban_cards WHERE id = ?').run(id)
  },
}

// --- Sticky Notes (Step 1 Brainstorming Canvas) ---
export type StickyNote = {
  id: string
  project_id: string
  content: string
  color: string
  x: number
  y: number
  created_at: string
  updated_at: string
}

export const stickyNotesDb = {
  list: (projectId: string): StickyNote[] =>
    db.prepare('SELECT * FROM sticky_notes WHERE project_id = ? ORDER BY created_at ASC').all(projectId) as StickyNote[],
  create: (data: Omit<StickyNote, 'id' | 'created_at' | 'updated_at'>): StickyNote => {
    const id = generateId()
    const ts = now()
    db.prepare(
      'INSERT INTO sticky_notes (id, project_id, content, color, x, y, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.project_id, data.content, data.color || '#fef08a', data.x || 50, data.y || 50, ts, ts)
    return db.prepare('SELECT * FROM sticky_notes WHERE id = ?').get(id) as StickyNote
  },
  update: (id: string, data: Partial<StickyNote>): StickyNote | undefined => {
    const existing = db.prepare('SELECT * FROM sticky_notes WHERE id = ?').get(id) as StickyNote | undefined
    if (!existing) return undefined
    const merged = { ...existing, ...data, updated_at: now() }
    db.prepare(
      'UPDATE sticky_notes SET content=?, color=?, x=?, y=?, updated_at=? WHERE id=?'
    ).run(merged.content, merged.color, merged.x, merged.y, merged.updated_at, id)
    return db.prepare('SELECT * FROM sticky_notes WHERE id = ?').get(id) as StickyNote
  },
  delete: (id: string): void => {
    db.prepare('DELETE FROM sticky_notes WHERE id = ?').run(id)
  },
}

// --- Vibe Requests (Step 4 봄비의 요청) ---
export type VibeRequest = {
  id: string
  project_id: string
  prompt: string
  status: string
  created_at: string
}

export const vibeRequestsDb = {
  list: (projectId: string): VibeRequest[] =>
    db.prepare('SELECT * FROM vibe_requests WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as VibeRequest[],
  add: (data: Omit<VibeRequest, 'id' | 'created_at'>): VibeRequest => {
    const id = generateId()
    const ts = now()
    db.prepare(
      'INSERT INTO vibe_requests (id, project_id, prompt, status, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, data.project_id, data.prompt, data.status || 'completed', ts)
    return db.prepare('SELECT * FROM vibe_requests WHERE id = ?').get(id) as VibeRequest
  },
}

// --- Step Inspections (사전 점검) ---
export type StepInspection = {
  id: string
  project_id: string
  step: number
  score: number
  status: string
  feedback: string
  updated_at: string
}

export const inspectionsDb = {
  get: (projectId: string, step: number): StepInspection | undefined =>
    db.prepare('SELECT * FROM step_inspections WHERE project_id = ? AND step = ?').get(projectId, step) as StepInspection | undefined,
  upsert: (projectId: string, step: number, score: number, status: string, feedback: string[]): StepInspection => {
    const existing = inspectionsDb.get(projectId, step)
    const ts = now()
    const fbStr = JSON.stringify(feedback)
    if (existing) {
      db.prepare(
        'UPDATE step_inspections SET score=?, status=?, feedback=?, updated_at=? WHERE id=?'
      ).run(score, status, fbStr, ts, existing.id)
      return db.prepare('SELECT * FROM step_inspections WHERE id = ?').get(existing.id) as StepInspection
    }
    const id = generateId()
    db.prepare(
      'INSERT INTO step_inspections (id, project_id, step, score, status, feedback, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, step, score, status, fbStr, ts)
    return db.prepare('SELECT * FROM step_inspections WHERE id = ?').get(id) as StepInspection
  },
}
