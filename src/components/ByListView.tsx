import { useMemo } from 'react'
import { useAppStore, getVisibleLists } from '../stores/appStore'
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
  const lists = useMemo(
    () => getVisibleLists({ lists: allLists, hiddenListIds }),
    [allLists, hiddenListIds]
  )
  const tasksByList = useAppStore((s) => s.tasksByList)
  const llmScores = useAppStore((s) => s.llmScores)
  const selectedListId = useAppStore((s) => s.selectedListId)

  // 如果选中了特定列表，只显示该列表（且该列表仍在可见范围内）
  const displayLists = selectedListId
    ? lists.filter((l) => l.id === selectedListId)
    : lists

  // 过滤掉没有任务的列表
  const listsWithTasks = displayLists.filter(
    (l) => (tasksByList[l.id]?.length ?? 0) > 0
  )

  if (listsWithTasks.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        {t.noTasks}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {listsWithTasks.map((list) => (
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
