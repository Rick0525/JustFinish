// Vercel Serverless Function - 大模型 API 代理
// 将浏览器请求转发到用户配置的大模型 API，绕过 CORS 限制

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAllowedUrl } from './_shared/llmProviders.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' })
  }

  try {
    const { targetUrl, apiKey, body } = req.body

    if (!targetUrl || !apiKey || !body) {
      return res.status(400).json({ error: '缺少必要参数：targetUrl, apiKey, body' })
    }

    if (!isAllowedUrl(targetUrl)) {
      return res.status(403).json({ error: '目标地址不在允许列表中' })
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

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({
      error: `代理请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
    })
  }
}
