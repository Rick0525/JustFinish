import { useState } from 'react'
import { useT } from '../i18n'
import { useSettings } from '../hooks/useSettings'
import { LLM_PROVIDERS, getProviderById } from '../utils/llmProviders'
import type { LLMConfig } from '../types'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  accountName?: string
  onSignOut: () => void
  onLLMConfigSaved?: () => void
}

/** 设置弹窗 */
export function SettingsModal({
  open,
  onClose,
  accountName,
  onSignOut,
  onLLMConfigSaved,
}: SettingsModalProps) {
  const t = useT()
  const { llmConfig, saveLLMConfig } = useSettings()

  const [providerId, setProviderId] = useState(llmConfig?.providerId || '')
  const [apiKey, setApiKey] = useState(llmConfig?.apiKey || '')
  const [model, setModel] = useState(llmConfig?.model || '')
  const [saved, setSaved] = useState(false)

  if (!open) return null

  const selectedProvider = getProviderById(providerId)

  const handleSaveLLM = () => {
    const config: LLMConfig = {
      providerId,
      apiKey: apiKey.trim(),
      model: model.trim(),
    }
    saveLLMConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onLLMConfigSaved?.()
  }

  const isValid = providerId && apiKey.trim() && model.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{t.settings}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* 微软账号 */}
          {accountName && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {t.settingsAccount}
              </h3>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <span className="text-sm text-gray-600">{accountName}</span>
                <button
                  onClick={onSignOut}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  {t.settingsSignOut}
                </button>
              </div>
            </div>
          )}

          {/* 大模型配置 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              {t.settingsLLM}
            </h3>
            <div className="space-y-3">
              {/* 供应商选择 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t.settingsLLMProvider}
                </label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">{t.settingsLLMProviderPlaceholder}</option>
                  {LLM_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {/* 显示 Base URL */}
                {selectedProvider && (
                  <p className="mt-1.5 text-xs text-gray-400 font-mono truncate">
                    {selectedProvider.baseUrl}
                  </p>
                )}
              </div>

              {/* API 密钥 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t.settingsLLMApiKey}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t.settingsLLMApiKeyPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 模型名称 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {t.settingsLLMModel}
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={t.settingsLLMModelPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 保存按钮 */}
              <button
                onClick={handleSaveLLM}
                disabled={!isValid}
                className="w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saved ? t.settingsLLMSaved : t.settingsLLMSave}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
