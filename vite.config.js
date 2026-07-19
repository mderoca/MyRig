import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Runs the files in /api as local endpoints during `npm run dev`.
 *
 * In production Vercel turns each file in /api into a serverless function on its own.
 * This plugin reproduces just enough of that contract (req.query, req.body,
 * res.status().json()) so the app can be developed and demoed with a plain
 * `npm run dev`, with no Vercel CLI installed.
 */
function vercelApiDevServer() {
  return {
    name: 'myrig-api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const url = new URL(req.url, 'http://localhost')
        const segments = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean)

        // Resolve /api/games/valorant-123 to api/games/[id].js, /api/parts to api/parts.js, etc.
        const params = {}
        let handlerPath = null
        const staticPath = resolve(process.cwd(), 'api', `${segments.join('/')}.js`)
        if (existsSync(staticPath)) {
          handlerPath = staticPath
        } else if (segments.length > 1) {
          // Any [param].js in the parent directory, not just [id].js - Vercel
          // names the query key after the file, so api/auth/[action].js gives
          // req.query.action. Hardcoding 'id' here silently 404s every other one.
          const dir = resolve(process.cwd(), 'api', ...segments.slice(0, -1))
          if (existsSync(dir)) {
            const dynamicFile = readdirSync(dir).find((name) => /^\[.+\]\.js$/.test(name))
            if (dynamicFile) {
              handlerPath = resolve(dir, dynamicFile)
              params[dynamicFile.slice(1, -4)] = segments[segments.length - 1]
            }
          }
        }

        if (!handlerPath) {
          res.statusCode = 404
          res.setHeader('content-type', 'application/json')
          return res.end(JSON.stringify({ error: `No API route for ${url.pathname}` }))
        }

        try {
          const mod = await server.ssrLoadModule(handlerPath)
          const handler = mod.default

          req.query = { ...params, ...Object.fromEntries(url.searchParams) }
          req.body = await readJsonBody(req)

          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (payload) => {
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(payload))
            return res
          }

          await handler(req, res)
        } catch (err) {
          server.config.logger.error(`[api] ${url.pathname} failed: ${err.stack || err}`)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err.message || 'API route crashed' }))
        }
      })
    },
  }
}

function readJsonBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(undefined)
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => {
      if (!raw) return resolve(undefined)
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(raw)
      }
    })
  })
}

export default defineConfig({
  plugins: [vue(), vercelApiDevServer()],
  server: { port: 5173 },
})
