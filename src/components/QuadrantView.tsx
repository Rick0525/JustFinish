import { useMemo } from 'react'
import { useAppStore, getVisibleTasks } from '../stores/appStore'
import { TaskList } from './TaskList'
import { getQuadrant, getQuadrantByDate } from '../utils/quadrant'
import { useT } from '../i18n'
import { isLLMConfigured } from '../hooks/useSettings'
import type { Quadrant, TodoTask } from '../types'

interface QuadrantViewProps {
  onComplete: (listId: string, taskId: string) => Promise<void>
}

/** 四象限配置 */
const quadrantConfig: Record<
  Quadrant,
  { titleKey: 'quadrantDoFirst' | 'quadrantSchedule' | 'quadrantDelegate' | 'quadrantLater'
    descKey: 'quadrantDoFirstDesc' | 'quadrantScheduleDesc' | 'quadrantDelegateDesc' | 'quadrantLaterDesc'
    borderColor: string
    headerColor: string
    bgColor: string }
> = {
  doFirst: {
    titleKey: 'quadrantDoFirst',
    descKey: 'quadrantDoFirstDesc',
    borderColor: 'border-red-200',
    headerColor: 'text-red-700 bg-red-50',
    bgColor: 'bg-red-50/30',
  },
  schedule: {
    titleKey: 'quadrantSchedule',
    descKey: 'quadrantScheduleDesc',
    borderColor: 'border-blue-200',
    headerColor: 'text-blue-700 bg-blue-50',
    bgColor: 'bg-blue-50/30',
  },
  delegate: {
    titleKey: 'quadrantDelegate',
    descKey: 'quadrantDelegateDesc',
    borderColor: 'border-orange-200',
    headerColor: 'text-orange-700 bg-orange-50',
    bgColor: 'bg-orange-50/30',
  },
  later: {
    titleKey: 'quadrantLater',
    descKey: 'quadrantLaterDesc',
    borderColor: 'border-gray-200',
    headerColor: 'text-gray-600 bg-gray-50',
    bgColor: 'bg-gray-50/30',
  },
}

/** 四象限视图 */
export function QuadrantView({ onComplete }: QuadrantViewProps) {
  const t = useT()
  const tasksByList = useAppStore((s) => s.tasksByList)
  const hiddenListIds = useAppStore((s) => s.hiddenListIds)
  const llmScores = useAppStore((s) => s.llmScores)
  const isSorting = useAppStore((s) => s.isSorting)

  const hasLLM = isLLMConfigured()
  const hasScores = Object.keys(llmScores).length > 0

  // 将任务分配到四象限
  const quadrants = useMemo(() => {
    const tasks = getVisibleTasks({ tasksByList, hiddenListIds })
    const result: Record<Quadrant, TodoTask[]> = {
      doFirst: [],
      schedule: [],
      delegate: [],
      later: [],
    }

    for (const task of tasks) {
      const score = llmScores[task.id]
      const q = score ? getQuadrant(score) : getQuadrantByDate(task)
      result[q].push(task)
    }

    return result
  }, [tasksByList, hiddenListIds, llmScores])

  const quadrantOrder: Quadrant[] = ['doFirst', 'schedule', 'delegate', 'later']

  return (
    <div>
      {/* 状态提示 */}
      {isSorting && (
        <div className="mb-3 px-3 text-xs text-blue-500 flex items-center gap-1">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t.sorting}
        </div>
      )}
      {!hasScores && !isSorting && (
        <div className="mb-3 px-3 text-xs text-gray-400">
          {hasLLM ? t.sortByDate : t.settingsLLMConfigureHint}
        </div>
      )}

      {/* 2x2 网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrantOrder.map((q) => {
          const config = quadrantConfig[q]
          return (
            <div
              key={q}
              className={`rounded-xl border ${config.borderColor} ${config.bgColor} overflow-hidden min-h-[200px] flex flex-col`}
            >
              {/* 象限标题 */}
              <div className={`px-3 py-2 ${config.headerColor} border-b ${config.borderColor}`}>
                <h3 className="text-sm font-semibold">{t[config.titleKey]}</h3>
                <p className="text-xs opacity-70">{t[config.descKey]}</p>
              </div>

              {/* 任务列表 */}
              <div className="flex-1 overflow-y-auto max-h-[400px] p-1">
                <TaskList
                  tasks={quadrants[q]}
                  scores={llmScores}
                  onComplete={onComplete}
                />
              </div>

              {/* 任务计数 */}
              <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
                {quadrants[q].length} {quadrants[q].length === 1 ? 'task' : 'tasks'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
