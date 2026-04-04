import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * 本地开发用的大模型代理中间件
 * 生产环境由 Vercel Serverless Function 或 Cloudflare Pages Function 处理
 */
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
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const { targetUrl, apiKey, body: reqBody } = JSON.parse(body)

            if (!targetUrl || !apiKey || !reqBody) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: '缺少必要参数' }))
              return
            }

            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify(reqBody),
            })

            const data = await response.text()
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch (error) {
            res.statusCode = 500
            res.end(JSON.stringify({
              error: `代理请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
            }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), llmProxyPlugin()],
})
