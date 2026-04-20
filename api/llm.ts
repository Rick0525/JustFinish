// Vercel Serverless Function - 大模型 API 代理
// 将浏览器请求转发到用户配置的大模型 API，绕过 CORS 限制

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAllowedUrl } from '../src/utils/llmProviders.js'

const MAX_BODY_SIZE = 200_000
const FETCH_TIMEOUT_MS = 30_000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' })
  }

  try {
    const { targetUrl, apiKey, body } = req.body

    if (!targetUrl || !body) {
      return res.status(400).json({ error: '缺少必要参数：targetUrl, body' })
    }

    if (!isAllowedUrl(targetUrl)) {
      return res.status(403).json({ error: '目标地址不在允许列表中' })
    }

    const payload = JSON.stringify(body)
    if (payload.length > MAX_BODY_SIZE) {
      return res.status(413).json({ error: '请求体过大' })
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

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? '上游请求超时'
      : '代理请求失败'
    return res.status(502).json({ error: message })
  }
}
