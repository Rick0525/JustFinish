import { useState, useEffect, useCallback } from 'react'
import type { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { getMsalInstance, loginPopup, resetMsalInstance } from './services/auth'
import { LoginScreen } from './components/LoginScreen'
import { Layout } from './components/Layout'

/** 应用根组件 */
export default function App() {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // 初始化 MSAL
  useEffect(() => {
    const init = async () => {
      try {
        const instance = await getMsalInstance()
        if (instance) {
          setMsalInstance(instance)
          // 检查是否已有登录账号
          const accounts = instance.getAllAccounts()
          if (accounts.length > 0) {
            setAccount(accounts[0])
          }
        }
      } catch {
        // MSAL 初始化失败（可能 Client ID 无效）
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  /** 登录流程 */
  const handleLogin = useCallback(async () => {
    // 重置并重新创建实例（支持 Client ID 变更后重新登录）
    resetMsalInstance()
    const instance = await getMsalInstance()
    if (!instance) return

    setMsalInstance(instance)
    const result = await loginPopup(instance)
    setAccount(result.account)
  }, [])

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  // 未登录
  if (!msalInstance || !account) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // 已登录
  return <Layout msalInstance={msalInstance} account={account} />
}
