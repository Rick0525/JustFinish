// Cloudflare Pages Function - 大模型 API 代理
// 将浏览器请求转发到用户配置的大模型 API，绕过 CORS 限制

import { isAllowedUrl } from '../../src/utils/llmProviders'

type Env = Record<string, unknown>

const MAX_BODY_SIZE = 200_000
const FETCH_TIMEOUT_MS = 30_000

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

  try {
    const { targetUrl, apiKey, body } = await context.request.json() as {
      targetUrl?: string
      apiKey?: string
      body?: unknown
    }

    if (!targetUrl || !body) {
      return json({ error: '缺少必要参数：targetUrl, body' }, 400)
    }

    if (!isAllowedUrl(targetUrl)) {
      return json({ error: '目标地址不在允许列表中' }, 403)
    }

    const payload = JSON.stringify(body)
    if (payload.length > MAX_BODY_SIZE) {
      return json({ error: '请求体过大' }, 413)
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
    return json(data, response.status)
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? '上游请求超时'
      : '代理请求失败'
    return json({ error: message }, 502)
  }
}
