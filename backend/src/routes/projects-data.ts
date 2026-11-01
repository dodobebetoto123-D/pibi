import { Hono } from 'hono'
import { artifactsDb, chatDb, kanbanDb, stickyNotesDb, vibeRequestsDb, inspectionsDb, projectBelongsToUser, recordBelongsToProject } from '../db.js'
import type { AppEnv } from '../auth.js'

const app = new Hono<AppEnv>()

app.use('/:id/*', async (c, next) => {
  if (!projectBelongsToUser(c.req.param('id'), c.get('uid'))) return c.json({ error: 'project not found' }, 404)
  await next()
})

const validStep = (step: number) => Number.isInteger(step) && step >= 0 && step <= 3
const validText = (value: unknown, max = 20000): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max
const validColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)

// Artifacts
app.get('/:id/artifacts', (c) => {
  const artifacts = artifactsDb.list(c.req.param('id'))
  return c.json(artifacts)
})

app.get('/:id/artifacts/:step', (c) => {
  const artifacts = artifactsDb.getByStep(c.req.param('id'), parseInt(c.req.param('step')))
  return c.json(artifacts)
})

app.post('/:id/artifacts', async (c) => {
  const body = await c.req.json<{ step: number; type: string; content: string }>()
  if (!validStep(body.step) || !validText(body.type, 40) || !validText(body.content, 500000))
    return c.json({ error: 'invalid step, type, or content' }, 400)
  const artifact = artifactsDb.upsert({
    project_id: c.req.param('id'),
    step: body.step,
    type: body.type,
    content: body.content,
  })
  return c.json(artifact, 201)
})

// Sticky Notes (Step 1)
app.get('/:id/notes', (c) => {
  const notes = stickyNotesDb.list(c.req.param('id'))
  return c.json(notes)
})

app.post('/:id/notes', async (c) => {
  const body = await c.req.json<{ content: string; color?: string; x?: number; y?: number }>()
  if (!validText(body.content, 2000) || (body.color !== undefined && !validColor(body.color)) ||
      (body.x !== undefined && (!Number.isFinite(body.x) || body.x < 0 || body.x > 100)) ||
      (body.y !== undefined && (!Number.isFinite(body.y) || body.y < 0 || body.y > 100)))
    return c.json({ error: 'invalid note content, color, or position' }, 400)
  const note = stickyNotesDb.create({
    project_id: c.req.param('id'),
    content: body.content,
    color: body.color || '#fef08a',
    x: body.x || 50,
    y: body.y || 50,
  })
  return c.json(note, 201)
})

app.patch('/:id/notes/:noteId', async (c) => {
  const body = await c.req.json<Partial<{ content: string; color: string; x: number; y: number }>>()
  if (!recordBelongsToProject('sticky_notes', c.req.param('noteId'), c.req.param('id')))
    return c.json({ error: 'not found' }, 404)
  if ((body.content !== undefined && !validText(body.content, 2000)) ||
      (body.color !== undefined && !validColor(body.color)) ||
      (body.x !== undefined && (!Number.isFinite(body.x) || body.x < 0 || body.x > 100)) ||
      (body.y !== undefined && (!Number.isFinite(body.y) || body.y < 0 || body.y > 100)))
    return c.json({ error: 'invalid note content, color, or position' }, 400)
  const updated = stickyNotesDb.update(c.req.param('noteId'), body)
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

app.delete('/:id/notes/:noteId', (c) => {
  if (!recordBelongsToProject('sticky_notes', c.req.param('noteId'), c.req.param('id')))
    return c.json({ error: 'not found' }, 404)
  stickyNotesDb.delete(c.req.param('noteId'))
  return c.json({ ok: true })
})

// Vibe Requests (Step 4)
app.get('/:id/requests', (c) => {
  const reqs = vibeRequestsDb.list(c.req.param('id'))
  return c.json(reqs)
})

app.post('/:id/requests', async (c) => {
  const body = await c.req.json<{ prompt: string; status?: string }>()
  if (!validText(body.prompt, 10000)) return c.json({ error: 'prompt is required' }, 400)
  const req = vibeRequestsDb.add({
    project_id: c.req.param('id'),
    prompt: body.prompt,
    status: body.status || 'completed',
  })
  return c.json(req, 201)
})

// Step Inspections (사전 점검)
app.get('/:id/inspections/:step', (c) => {
  const step = parseInt(c.req.param('step'))
  if (!validStep(step)) return c.json({ error: 'invalid step' }, 400)
  const inspection = inspectionsDb.get(c.req.param('id'), step)
  if (!inspection) return c.json(null)
  return c.json({
    ...inspection,
    feedback: JSON.parse(inspection.feedback || '[]'),
  })
})

app.post('/:id/inspections/:step', async (c) => {
  const step = parseInt(c.req.param('step'))
  const body = await c.req.json<{ score: number; status: string; feedback: string[] }>()
  if (!validStep(step) || !Number.isInteger(body.score) || body.score < 0 || body.score > 100 ||
      !['good', 'needs_improvement'].includes(body.status) || !Array.isArray(body.feedback) ||
      body.feedback.length > 20 || body.feedback.some((item) => !validText(item, 1000)))
    return c.json({ error: 'invalid inspection payload' }, 400)
  const inspection = inspectionsDb.upsert(c.req.param('id'), step, body.score, body.status, body.feedback)
  return c.json({
    ...inspection,
    feedback: JSON.parse(inspection.feedback),
  }, 201)
})

// Chat history
app.get('/:id/chat/:step', (c) => {
  const step = parseInt(c.req.param('step'))
  if (!validStep(step)) return c.json({ error: 'invalid step' }, 400)
  const messages = chatDb.list(c.req.param('id'), step)
  return c.json(messages)
})

app.post('/:id/chat', async (c) => {
  const body = await c.req.json<{ step: number; role: string; content: string }>()
  if (!validStep(body.step) || !['user', 'assistant'].includes(body.role) || !validText(body.content, 500000))
    return c.json({ error: 'invalid chat message' }, 400)
  const msg = chatDb.add({
    project_id: c.req.param('id'),
    step: body.step,
    role: body.role as 'user' | 'assistant',
    content: body.content,
  })
  return c.json(msg, 201)
})

// Kanban
app.get('/:id/kanban', (c) => {
  const cards = kanbanDb.list(c.req.param('id'))
  return c.json(cards)
})

app.post('/:id/kanban', async (c) => {
  const body = await c.req.json<{ column_id: string; title: string; description?: string; color?: string; position?: number }>()
  if (!validText(body.column_id, 40) || !validText(body.title, 200) ||
      (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) ||
      (body.color !== undefined && !validColor(body.color)) ||
      (body.position !== undefined && (!Number.isInteger(body.position) || body.position < 0)))
    return c.json({ error: 'invalid kanban card' }, 400)
  const card = kanbanDb.create({
    project_id: c.req.param('id'),
    column_id: body.column_id,
    title: body.title,
    description: body.description ?? '',
    color: body.color ?? '#fef08a',
    position: body.position ?? 0,
  })
  return c.json(card, 201)
})

app.patch('/:id/kanban/:cardId', async (c) => {
  const body = await c.req.json<Partial<{ column_id: string; title: string; description: string; color: string; position: number }>>()
  if (!recordBelongsToProject('kanban_cards', c.req.param('cardId'), c.req.param('id')))
    return c.json({ error: 'not found' }, 404)
  if ((body.column_id !== undefined && !validText(body.column_id, 40)) ||
      (body.title !== undefined && !validText(body.title, 200)) ||
      (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) ||
      (body.color !== undefined && !validColor(body.color)) ||
      (body.position !== undefined && (!Number.isInteger(body.position) || body.position < 0)))
    return c.json({ error: 'invalid kanban card' }, 400)
  const updated = kanbanDb.update(c.req.param('cardId'), body)
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

app.delete('/:id/kanban/:cardId', (c) => {
  if (!recordBelongsToProject('kanban_cards', c.req.param('cardId'), c.req.param('id')))
    return c.json({ error: 'not found' }, 404)
  kanbanDb.delete(c.req.param('cardId'))
  return c.json({ ok: true })
})

export default app
