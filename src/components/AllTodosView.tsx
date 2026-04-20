import { useMemo } from 'react'
import { useAppStore, getVisibleTasks, isLLMConfigured } from '../stores/appStore'
import { TaskList } from './TaskList'
import { sortTasksByDate } from '../utils/quadrant'
import { getCompositeScore } from '../utils/quadrant'
import { useT } from '../i18n'

interface AllTodosViewProps {
  onComplete: (listId: string, taskId: string) => Promise<void>
}

/** 全部待办视图（平铺排序） */
export function AllTodosView({ onComplete }: AllTodosViewProps) {
  const t = useT()
  const tasksByList = useAppStore((s) => s.tasksByList)
  const hiddenListIds = useAppStore((s) => s.hiddenListIds)
  const llmScores = useAppStore((s) => s.llmScores)
  const isSorting = useAppStore((s) => s.isSorting)

  const sortedTasks = useMemo(() => {
    const tasks = getVisibleTasks({ tasksByList, hiddenListIds })

    // 有大模型评分时按综合分数排序
    const hasScores = Object.keys(llmScores).length > 0
    if (hasScores) {
      return [...tasks].sort((a, b) => {
        const scoreA = llmScores[a.id]
        const scoreB = llmScores[b.id]
        if (scoreA && scoreB) {
          return getCompositeScore(scoreB) - getCompositeScore(scoreA)
        }
        // 有评分的排前面
        if (scoreA && !scoreB) return -1
        if (!scoreA && scoreB) return 1
        return 0
      })
    }

    // 无评分时按截止日期排序
    return sortTasksByDate(tasks)
  }, [tasksByList, hiddenListIds, llmScores])

  const llmConfig = useAppStore((s) => s.llmConfig)
  const hasLLM = isLLMConfigured(llmConfig)
  const hasScores = Object.keys(llmScores).length > 0

  return (
    <div>
      {/* 排序状态提示 */}
      <div className="flex items-center gap-2 mb-3 px-3">
        {isSorting ? (
          <span className="text-xs text-blue-500 flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t.sorting}
          </span>
        ) : hasScores ? (
          <span className="text-xs text-green-600">{t.sortByLLM}</span>
        ) : hasLLM ? (
          <span className="text-xs text-gray-400">{t.sortByDate}</span>
        ) : (
          <span className="text-xs text-gray-400">{t.settingsLLMNotConfigured}</span>
        )}
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <TaskList
          tasks={sortedTasks}
          scores={llmScores}
          onComplete={onComplete}
        />
      </div>
    </div>
  )
}
