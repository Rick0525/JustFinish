import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { isAllowedUrl } from './src/utils/llmProviders'

/**
 * 本地开发用的大模型代理中间件
 * 生产环境由 Vercel Serverless Function 或 Cloudflare Pages Function 处理
 */
const MAX_BODY_SIZE = 200_000
const FETCH_TIMEOUT_MS = 30_000

function llmProxyPlugin(): Plugin {
  return {
    name: 'llm-proxy',
    configureServer(server) {
      server.middlewares.use('/api/llm', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: '仅支持 POST 请求' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
          if (body.length > MAX_BODY_SIZE) {
            res.statusCode = 413
            res.end(JSON.stringify({ error: '请求体过大' }))
            req.destroy()
          }
        })
        req.on('end', async () => {
          if (res.writableEnded) return
          try {
            const { targetUrl, apiKey, body: reqBody } = JSON.parse(body)

            if (!targetUrl || !reqBody) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: '缺少必要参数' }))
              return
            }

            if (!isAllowedUrl(targetUrl)) {
              res.statusCode = 403
              res.end(JSON.stringify({ error: '目标地址不在允许列表中' }))
              return
            }

            const payload = JSON.stringify(reqBody)
            if (payload.length > MAX_BODY_SIZE) {
              res.statusCode = 413
              res.end(JSON.stringify({ error: '请求体过大' }))
              return
            }

            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

            const response = await fetch(targetUrl, {
              method: 'POST',
              headers,
              body: payload,
              signal: controller.signal,
            })
            clearTimeout(timer)

            const data = await response.text()
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch (error) {
            res.statusCode = 502
            const message = error instanceof Error && error.name === 'AbortError'
              ? '上游请求超时'
              : '代理请求失败'
            res.end(JSON.stringify({ error: message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), llmProxyPlugin()],
})
