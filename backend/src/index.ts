import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import projectsRoute from './routes/projects.js'
import projectsDataRoute from './routes/projects-data.js'
import aiRoute from './routes/ai.js'
import { authMiddleware, type AppEnv } from './auth.js'

const app = new Hono<AppEnv>()

app.use('*', logger())
app.use('*', cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))

app.get('/api/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }))
app.use('/api/*', authMiddleware)

app.route('/api/projects', projectsRoute)
app.route('/api/projects', projectsDataRoute)
app.route('/api/ai', aiRoute)

const PORT = parseInt(process.env.PORT ?? '3000')

serve({ fetch: app.fetch, port: PORT, hostname: '127.0.0.1' }, (info) => {
  console.log(`🚀 Backend running at http://localhost:${info.port}`)
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY not set — AI features will not work')
  }
})
