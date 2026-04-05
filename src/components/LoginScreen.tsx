import { useState } from 'react'
import { useT } from '../i18n'
import { getClientId, setClientId } from '../services/auth'

interface LoginScreenProps {
  onLogin: () => Promise<void>
}

/** 登录页面 */
export function LoginScreen({ onLogin }: LoginScreenProps) {
  const t = useT()
  const [clientId, setClientIdState] = useState(getClientId())
  const [loading, setLoading] = useState(false)
  const [showClientIdInput, setShowClientIdInput] = useState(!getClientId())

  const hasClientId = !!clientId.trim()

  const handleLogin = async () => {
    if (!hasClientId) {
      setShowClientIdInput(true)
      return
    }
    setLoading(true)
    try {
      // 保存 Client ID
      setClientId(clientId.trim())
      await onLogin()
    } catch (err) {
      console.error('[Auth] 登录失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveClientId = () => {
    if (clientId.trim()) {
      setClientId(clientId.trim())
      setShowClientIdInput(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full max-w-md mx-4">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {t.appName}
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            {t.loginDesc}
          </p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Client ID 配置 */}
          {showClientIdInput && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.settingsClientId}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientIdState(e.target.value)}
                  placeholder={t.settingsClientIdPlaceholder}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveClientId}
                  disabled={!clientId.trim()}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {t.settingsSave}
                </button>
              </div>
            </div>
          )}

          {/* 登录按钮 */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors font-medium"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              /* 微软图标 */
              <svg className="w-5 h-5" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
            )}
            <span>{hasClientId ? t.loginButton : t.loginNeedClientId}</span>
          </button>

          {/* 切换 Client ID 显示 */}
          {!showClientIdInput && (
            <button
              onClick={() => setShowClientIdInput(true)}
              className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t.settingsClientId}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
