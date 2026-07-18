import { createApp } from './routes'
import type { Env } from './types'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const app = createApp()
    return app.fetch(request, env, ctx)
  }
}
