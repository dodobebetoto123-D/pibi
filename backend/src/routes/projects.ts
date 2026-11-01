import { Hono } from 'hono'
import { projectsDb } from '../db.js'
import type { AppEnv } from '../auth.js'

const app = new Hono<AppEnv>()

app.get('/', (c) => {
  const projects = projectsDb.list(c.get('uid'))
  return c.json(projects)
})

app.post('/', async (c) => {
  const body = await c.req.json<{ name: string; type?: string; description?: string }>()
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200 ||
      (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) ||
      (body.type !== undefined && !['web', 'mobile', 'api', 'data', 'other'].includes(body.type)))
    return c.json({ error: 'invalid project name, type, or description' }, 400)
  const project = projectsDb.create({
    name: body.name.trim(),
    type: body.type ?? 'web',
    description: body.description ?? '',
    status: 'planned',
    current_step: 0,
  }, c.get('uid'))
  return c.json(project, 201)
})

app.get('/:id', (c) => {
  const project = projectsDb.get(c.req.param('id'), c.get('uid'))
  if (!project) return c.json({ error: 'not found' }, 404)
  return c.json(project)
})

app.patch('/:id', async (c) => {
  const body = await c.req.json<Partial<{ name: string; type: string; description: string; status: string; current_step: number }>>()
  if ((body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200)) ||
      (body.type !== undefined && !['web', 'mobile', 'api', 'data', 'other'].includes(body.type)) ||
      (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) ||
      (body.status !== undefined && !['planned', 'active', 'done'].includes(body.status)) ||
      (body.current_step !== undefined && (!Number.isInteger(body.current_step) || body.current_step < 0 || body.current_step > 3)))
    return c.json({ error: 'invalid project update' }, 400)
  const updated = projectsDb.update(c.req.param('id'), body as any, c.get('uid'))
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

app.delete('/:id', (c) => {
  projectsDb.delete(c.req.param('id'), c.get('uid'))
  return c.json({ ok: true })
})

export default app
