import { useState, useCallback } from 'react'
import type { LLMConfig } from '../types'
import { STORAGE_KEYS } from '../utils/constants'

/** 从 localStorage 读取大模型配置 */
function loadLLMConfig(): LLMConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.llmConfig)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** 检查大模型是否已配置 */
export function isLLMConfigured(): boolean {
  const config = loadLLMConfig()
  return !!(config?.providerId && config?.apiKey && config?.model)
}

/** React hook：管理大模型配置 */
export function useSettings() {
  const [llmConfig, setLlmConfigState] = useState<LLMConfig | null>(loadLLMConfig)

  /** 保存大模型配置到 localStorage */
  const saveLLMConfig = useCallback((config: LLMConfig) => {
    localStorage.setItem(STORAGE_KEYS.llmConfig, JSON.stringify(config))
    setLlmConfigState(config)
  }, [])

  /** 获取大模型配置（直接从 localStorage 读取，确保最新） */
  const getLLMConfig = useCallback((): LLMConfig | null => {
    return loadLLMConfig()
  }, [])

  return {
    llmConfig,
    saveLLMConfig,
    getLLMConfig,
    isConfigured: !!(llmConfig?.providerId && llmConfig?.apiKey && llmConfig?.model),
  }
}
