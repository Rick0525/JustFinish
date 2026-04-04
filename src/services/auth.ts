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

let msalInstance: PublicClientApplication | null = null

/** 获取或创建 MSAL 实例 */
export async function getMsalInstance(): Promise<PublicClientApplication | null> {
  const clientId = getClientId()
  if (!clientId) return null

  if (msalInstance) return msalInstance

  msalInstance = new PublicClientApplication(createMsalConfig(clientId))
  await msalInstance.initialize()

  // 处理重定向回调
  try {
    await msalInstance.handleRedirectPromise()
  } catch {
    // 忽略重定向处理错误
  }

  return msalInstance
}

/** 重置 MSAL 实例（当 Client ID 变更时调用） */
export function resetMsalInstance() {
  msalInstance = null
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
