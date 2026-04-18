import {
  PublicClientApplication,
  type Configuration,
  type AccountInfo,
  type AuthenticationResult,
  InteractionRequiredAuthError,
} from '@azure/msal-browser'
import { MSAL_SCOPES, STORAGE_KEYS } from '../utils/constants'

/** 获取 Client ID：优先环境变量，其次 localStorage */
export function getClientId(): string {
  return (
    import.meta.env.VITE_MSAL_CLIENT_ID ||
    localStorage.getItem(STORAGE_KEYS.clientId) ||
    ''
  )
}

/** 保存 Client ID 到 localStorage */
export function setClientId(clientId: string) {
  localStorage.setItem(STORAGE_KEYS.clientId, clientId)
}

/** 创建 MSAL 配置 */
function createMsalConfig(clientId: string): Configuration {
  return {
    auth: {
      clientId,
      // 支持个人微软账号和组织账号
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  }
}

let msalInstancePromise: Promise<PublicClientApplication> | null = null

/** 获取或创建 MSAL 实例（保证 initialize 完成后才返回，且并发调用共享同一个初始化 Promise） */
export async function getMsalInstance(): Promise<PublicClientApplication | null> {
  const clientId = getClientId()
  if (!clientId) return null

  if (!msalInstancePromise) {
    msalInstancePromise = (async () => {
      const instance = new PublicClientApplication(createMsalConfig(clientId))
      await instance.initialize()
      try {
        await instance.handleRedirectPromise()
      } catch (err) {
        console.error('[MSAL] 重定向处理失败:', err)
      }
      return instance
    })().catch((err) => {
      // 初始化失败时清掉缓存，允许下次重试
      msalInstancePromise = null
      throw err
    })
  }

  return msalInstancePromise
}

/** 重置 MSAL 实例（当 Client ID 变更时调用） */
export function resetMsalInstance() {
  msalInstancePromise = null
}

/** 弹窗登录 */
export async function loginPopup(
  instance: PublicClientApplication
): Promise<AuthenticationResult> {
  return instance.loginPopup({
    scopes: MSAL_SCOPES,
  })
}

/** 静默获取 Token（失败则弹窗交互） */
export async function acquireToken(
  instance: PublicClientApplication,
  account: AccountInfo
): Promise<string> {
  try {
    const response = await instance.acquireTokenSilent({
      scopes: MSAL_SCOPES,
      account,
    })
    return response.accessToken
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const response = await instance.acquireTokenPopup({
        scopes: MSAL_SCOPES,
        account,
      })
      return response.accessToken
    }
    throw error
  }
}

/** 登出 */
export async function logout(instance: PublicClientApplication) {
  await instance.logoutPopup()
}
