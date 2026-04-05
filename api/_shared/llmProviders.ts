/** 大模型供应商定义 */
export interface LLMProvider {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** API 基础地址（不含 /chat/completions） */
  baseUrl: string
  /** 允许的域名列表（用于代理白名单校验） */
  hosts: string[]
}

/** 支持的大模型供应商列表（均兼容 OpenAI /chat/completions 格式） */
export const LLM_PROVIDERS: LLMProvider[] = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', hosts: ['api.openai.com'] },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', hosts: ['api.deepseek.com'] },
  { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', hosts: ['api.groq.com'] },
  { id: 'together', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', hosts: ['api.together.xyz'] },
  { id: 'fireworks', name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1', hosts: ['api.fireworks.ai'] },
  { id: 'mistral', name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', hosts: ['api.mistral.ai'] },
  { id: 'perplexity', name: 'Perplexity', baseUrl: 'https://api.perplexity.ai', hosts: ['api.perplexity.ai'] },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', hosts: ['openrouter.ai'] },
  { id: 'zhipu', name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', hosts: ['open.bigmodel.cn'] },
  { id: 'siliconflow', name: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', hosts: ['api.siliconflow.cn'] },
  { id: 'moonshot', name: 'Moonshot AI', baseUrl: 'https://api.moonshot.cn/v1', hosts: ['api.moonshot.cn'] },
  { id: 'yi', name: '零一万物', baseUrl: 'https://api.lingyiwanwu.com/v1', hosts: ['api.lingyiwanwu.com'] },
  { id: 'dashscope', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', hosts: ['dashscope.aliyuncs.com'] },
  { id: 'volcengine', name: '火山引擎', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', hosts: ['ark.cn-beijing.volces.com'] },
]

/** 所有允许的域名（用于代理白名单校验） */
export const ALLOWED_HOSTS: string[] = LLM_PROVIDERS.flatMap(p => p.hosts)

/** 根据 ID 获取供应商 */
export function getProviderById(id: string): LLMProvider | undefined {
  return LLM_PROVIDERS.find(p => p.id === id)
}

/** 校验 targetUrl 是否指向白名单中的大模型 API（仅精确匹配域名） */
export function isAllowedUrl(targetUrl: string): boolean {
  try {
    const url = new URL(targetUrl)
    if (url.protocol !== 'https:') return false
    return ALLOWED_HOSTS.includes(url.hostname)
  } catch {
    return false
  }
}
