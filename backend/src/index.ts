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
// CORS_ORIGINS 환경변수에 콤마로 구분해서 추가 도메인 지정 가능 (배포된 프론트엔드 도메인)
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
app.use('*', cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', ...corsOrigins] }))

app.get('/api/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }))
app.use('/api/*', authMiddleware)

app.route('/api/projects', projectsRoute)
app.route('/api/projects', projectsDataRoute)
app.route('/api/ai', aiRoute)

const PORT = parseInt(process.env.PORT ?? '3000')
// HOSTNAME 환경변수로 변경 가능 (Docker/호스팅에서는 0.0.0.0으로 설정)
const HOSTNAME = process.env.HOSTNAME ?? '127.0.0.1'

serve({ fetch: app.fetch, port: PORT, hostname: HOSTNAME }, (info) => {
  console.log(`🚀 Backend running at http://localhost:${info.port}`)
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY not set — AI features will not work')
  }
})
