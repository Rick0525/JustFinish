// Cloudflare Pages Function - 大模型 API 代理
// 将浏览器请求转发到用户配置的大模型 API，绕过 CORS 限制

import { isAllowedUrl } from '../../api/_shared/llmProviders'

type Env = Record<string, unknown>

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { targetUrl, apiKey, body } = await context.request.json() as {
      targetUrl?: string
      apiKey?: string
      body?: unknown
    }

    if (!targetUrl || !apiKey || !body) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数：targetUrl, apiKey, body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!isAllowedUrl(targetUrl)) {
      return new Response(
        JSON.stringify({ error: '目标地址不在允许列表中' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 转发请求到目标大模型 API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: `代理请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
