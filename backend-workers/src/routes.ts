import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { saveFrame, getSessionSummary, getSessionFrames } from './db'
import type { Env, LandmarkPacket } from './types'

export function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  app.use('*', cors({ origin: '*' }))

  app.get('/health', (c) => c.json({ status: 'ok' }))

  app.post('/api/landmarks', async (c) => {
    const packet = await c.req.json<LandmarkPacket>()
    const db = c.env.DB
    await saveFrame(db, packet)
    return c.json({ ok: true })
  })

  app.get('/api/sessions/:id/summary', async (c) => {
    const sessionId = c.req.param('id')
    const db = c.env.DB
    const summary = await getSessionSummary(db, sessionId)
    if (!summary) return c.json({ error: 'Session not found' }, 404)
    return c.json(summary)
  })

  app.get('/api/sessions/:id/frames', async (c) => {
    const sessionId = c.req.param('id')
    const limit = Number(c.req.query('limit') || '1000')
    const db = c.env.DB
    const frames = await getSessionFrames(db, sessionId, limit)
    return c.json(frames)
  })

  return app
}
