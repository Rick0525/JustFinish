import { useAppStore } from '../stores/appStore'
import { useT } from '../i18n'
import type { SyncStatus } from '../types'

interface SyncIndicatorProps {
  onRefresh: () => void
}

/** 同步状态指示器 */
export function SyncIndicator({ onRefresh }: SyncIndicatorProps) {
  const t = useT()
  const syncStatus = useAppStore((s) => s.syncStatus)

  const statusConfig: Record<SyncStatus, { text: string; color: string }> = {
    idle: { text: '', color: '' },
    syncing: { text: t.syncSyncing, color: 'text-blue-500' },
    success: { text: t.syncSuccess, color: 'text-green-500' },
    error: { text: t.syncError, color: 'text-red-500' },
  }

  const config = statusConfig[syncStatus]

  return (
    <div className="flex items-center gap-2">
      {/* 状态文字 */}
      {config.text && (
        <span className={`text-xs ${config.color} flex items-center gap-1`}>
          {syncStatus === 'syncing' && (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {syncStatus === 'success' && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {config.text}
        </span>
      )}

      {/* 刷新按钮 */}
      <button
        onClick={onRefresh}
        disabled={syncStatus === 'syncing'}
        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
        title={t.syncRefresh}
      >
        <svg
          className={`w-4 h-4 text-gray-500 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  )
}
