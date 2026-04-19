import { useState, useCallback, useEffect, useRef } from 'react'
import type { AccountInfo, PublicClientApplication } from '@azure/msal-browser'
import { useAppStore } from '../stores/appStore'
import { useT } from '../i18n'
import { Sidebar } from './Sidebar'
import { SyncIndicator } from './SyncIndicator'
import { SettingsModal } from './SettingsModal'
import { ByListView } from './ByListView'
import { AllTodosView } from './AllTodosView'
import { QuadrantView } from './QuadrantView'
import { useLists } from '../hooks/useLists'
import { useTasks } from '../hooks/useTasks'
import { useLLMSort } from '../hooks/useLLMSort'
import { useSettings } from '../hooks/useSettings'
import { acquireToken, logout } from '../services/auth'
import { saveLastSync } from '../services/cache'

interface LayoutProps {
  msalInstance: PublicClientApplication
  account: AccountInfo
}

/** 主布局组件 */
export function Layout({ msalInstance, account }: LayoutProps) {
  const t = useT()
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const viewMode = useAppStore((s) => s.viewMode)
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setSyncStatus = useAppStore((s) => s.setSyncStatus)
  const isSorting = useAppStore((s) => s.isSorting)

  const { loadFromCache: loadListsCache, syncLists } = useLists()
  const { loadFromCache: loadTasksCache, completeTask } = useTasks()
  const { loadFromCache: loadScoresCache, runSort, forceSort } = useLLMSort()
  const { getLLMConfig, isConfigured } = useSettings()

  const syncingRef = useRef(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  /** 获取 access token */
  const getToken = useCallback(async () => {
    return acquireToken(msalInstance, account)
  }, [msalInstance, account])

  /** 完整同步流程 */
  const doSync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncStatus('syncing')

    try {
      const token = await getToken()
      const { failedCount } = await syncLists(token)
      // saveLastSync / runSort 都是派生副作用，只在全部清单都同步成功时才推进：
      // 有清单失败说明 store 里是"部分新 + 部分旧"的混合态，记录成"刚同步过"会误导 UI，
      // 让 LLM 排序基于这个混合态算分还会写入 llmScores + llmHash 污染缓存
      if (failedCount === 0) {
        await saveLastSync()
      }
      setSyncStatus(failedCount > 0 ? 'error' : 'success')

      // 同步完成后尝试大模型排序（仅全部成功时）
      if (failedCount === 0) {
        const config = getLLMConfig()
        if (config?.providerId && config?.apiKey && config?.model) {
          try {
            await runSort(config)
          } catch (err) {
            console.error('[LLMSort] 排序失败:', err)
          }
        }
      }

      // 3 秒后清除成功状态（先清理旧定时器）
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => setSyncStatus('idle'), 3000)
    } catch (err) {
      console.error('[Sync] 同步失败:', err)
      setSyncStatus('error')
    } finally {
      syncingRef.current = false
    }
  }, [getToken, syncLists, setSyncStatus, getLLMConfig, runSort])

  /** 完成任务 */
  const handleComplete = useCallback(
    async (listId: string, taskId: string) => {
      const token = await getToken()
      await completeTask(token, listId, taskId)
    },
    [getToken, completeTask]
  )

  /** 登出 */
  const handleSignOut = useCallback(async () => {
    try {
      await logout(msalInstance)
    } catch (err) {
      console.error('[Auth] 登出失败:', err)
    }
  }, [msalInstance])

  /** 大模型配置保存后触发排序 */
  const handleLLMConfigSaved = useCallback(async () => {
    const config = getLLMConfig()
    if (config?.providerId && config?.apiKey && config?.model) {
      try {
        await forceSort(config)
      } catch (err) {
        console.error('[LLMSort] 排序失败:', err)
      }
    }
  }, [getLLMConfig, forceSort])

  // 启动时加载缓存并同步
  useEffect(() => {
    const init = async () => {
      await Promise.all([loadListsCache(), loadTasksCache(), loadScoresCache()])
      doSync()
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** 视图标题 */
  const viewTitle = {
    byList: t.viewByList,
    allTodos: t.viewAllTodos,
    quadrant: t.viewQuadrant,
  }[viewMode]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* 移动端汉堡菜单 */}
            <button
              onClick={() => setSidebarVisible(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 md:hidden"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h1 className="text-lg font-semibold text-gray-900">{viewTitle}</h1>

            {/* 大模型排序状态 */}
            {isSorting && (
              <span className="text-xs text-blue-500 flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.sorting}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 大模型排序按钮 */}
            {isConfigured && (
              <button
                onClick={handleLLMConfigSaved}
                disabled={isSorting}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t.sortRefresh}
              </button>
            )}

            <SyncIndicator onRefresh={doSync} />

            {/* 设置按钮 */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {viewMode === 'byList' && (
            <ByListView onComplete={handleComplete} />
          )}
          {viewMode === 'allTodos' && (
            <AllTodosView onComplete={handleComplete} />
          )}
          {viewMode === 'quadrant' && (
            <QuadrantView onComplete={handleComplete} />
          )}
        </div>
      </main>

      {/* 设置弹窗 */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        accountName={account.username || account.name || undefined}
        onSignOut={handleSignOut}
        onLLMConfigSaved={handleLLMConfigSaved}
      />
    </div>
  )
}
