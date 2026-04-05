import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge'

/**
 * 检测当前是否在 MSAL 弹窗回调页面中
 * 如果 URL 包含 #code= 或 #error=，说明是弹窗登录的回调
 */
function isMsalPopupCallback(): boolean {
  const hash = window.location.hash
  return hash.includes('code=') || hash.includes('error=')
}

if (isMsalPopupCallback()) {
  // 弹窗回调页面：调用 MSAL v5 的 redirect bridge
  // 将授权码通过 BroadcastChannel 传回父窗口，然后自动关闭弹窗
  const root = document.getElementById('root')!
  root.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;color:#999;'
  root.textContent = '正在处理登录...'

  broadcastResponseToMainFrame().catch(() => {
    // 处理失败时静默关闭
    try { window.close() } catch {}
  })
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
