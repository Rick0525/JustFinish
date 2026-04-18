import { useMemo } from 'react'
import { useAppStore, getSidebarLists } from '../stores/appStore'
import { TaskList } from './TaskList'
import { useT } from '../i18n'

interface ByListViewProps {
  onComplete: (listId: string, taskId: string) => Promise<void>
}

/** 按列表分组视图 */
export function ByListView({ onComplete }: ByListViewProps) {
  const t = useT()
  const allLists = useAppStore((s) => s.lists)
  const hiddenListIds = useAppStore((s) => s.hiddenListIds)
  const tasksByList = useAppStore((s) => s.tasksByList)
  const lists = useMemo(
    () => getSidebarLists({ lists: allLists, hiddenListIds, tasksByList }),
    [allLists, hiddenListIds, tasksByList]
  )
  const llmScores = useAppStore((s) => s.llmScores)
  const selectedListId = useAppStore((s) => s.selectedListId)

  // 选中特定清单时只展示该清单；getSidebarLists 已过滤掉空清单
  const displayLists = selectedListId
    ? lists.filter((l) => l.id === selectedListId)
    : lists

  if (displayLists.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        {t.noTasks}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {displayLists.map((list) => (
        <div key={list.id}>
          {/* 列表标题 */}
          <div className="flex items-center gap-2 mb-2 px-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              {list.displayName}
            </h3>
            <span className="text-xs text-gray-400">
              {tasksByList[list.id]?.length ?? 0}
            </span>
          </div>

          {/* 任务列表 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <TaskList
              tasks={tasksByList[list.id] || []}
              scores={llmScores}
              onComplete={onComplete}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
