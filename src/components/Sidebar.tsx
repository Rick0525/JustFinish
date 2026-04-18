import { useMemo, type ReactNode } from 'react'
import { useAppStore, getVisibleLists } from '../stores/appStore'
import { useT } from '../i18n'
import type { ViewMode } from '../types'

interface SidebarProps {
  visible: boolean
  onClose: () => void
}

/** 侧边栏组件 */
export function Sidebar({ visible, onClose }: SidebarProps) {
  const t = useT()
  const allLists = useAppStore((s) => s.lists)
  const hiddenListIds = useAppStore((s) => s.hiddenListIds)
  const lists = useMemo(
    () => getVisibleLists({ lists: allLists, hiddenListIds }),
    [allLists, hiddenListIds]
  )
  const tasksByList = useAppStore((s) => s.tasksByList)
  const viewMode = useAppStore((s) => s.viewMode)
  const selectedListId = useAppStore((s) => s.selectedListId)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const setSelectedListId = useAppStore((s) => s.setSelectedListId)

  const viewModes: { mode: ViewMode; label: string; icon: ReactNode }[] = [
    {
      mode: 'byList',
      label: t.viewByList,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      mode: 'allTodos',
      label: t.viewAllTodos,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      mode: 'quadrant',
      label: t.viewQuadrant,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* 移动端遮罩 */}
      {visible && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 ${
          visible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 视图模式切换 */}
        <div className="p-4 space-y-1">
          {viewModes.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode)
                setSelectedListId(null)
                onClose()
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                viewMode === mode && !selectedListId
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* 分隔线 */}
        <div className="mx-4 border-t border-gray-100" />

        {/* 列表导航 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-3">
            Lists
          </p>
          {lists.map((list) => {
            const count = tasksByList[list.id]?.length ?? 0
            return (
              <button
                key={list.id}
                onClick={() => {
                  setViewMode('byList')
                  setSelectedListId(
                    selectedListId === list.id ? null : list.id
                  )
                  onClose()
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedListId === list.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{list.displayName}</span>
                {count > 0 && (
                  <span className="text-xs text-gray-400 ml-2">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}
