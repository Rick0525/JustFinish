import { useState } from 'react'
import type { TodoTask, LLMScore } from '../types'
import { DueBadge } from './DueBadge'

interface TaskItemProps {
  task: TodoTask
  score?: LLMScore
  onComplete: (listId: string, taskId: string) => Promise<void>
}

/** 单个任务行组件 */
export function TaskItem({ task, score, onComplete }: TaskItemProps) {
  const [completing, setCompleting] = useState(false)

  const handleComplete = async () => {
    setCompleting(true)
    // 等待动画播放
    setTimeout(async () => {
      try {
        await onComplete(task.listId, task.id)
      } catch {
        setCompleting(false)
      }
    }, 350)
  }

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-all ${
        completing ? 'task-completing' : ''
      }`}
    >
      {/* 勾选按钮 */}
      <button
        onClick={handleComplete}
        disabled={completing}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
          completing
            ? 'border-green-500 bg-green-500 check-pop'
            : 'border-gray-300 hover:border-blue-400 group-hover:border-blue-300'
        }`}
        aria-label="完成任务"
      >
        {completing && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 任务标题 */}
      <span className={`flex-1 text-sm leading-snug ${
        completing ? 'line-through text-gray-400' : 'text-gray-800'
      }`}>
        {task.title}
      </span>

      {/* 右侧信息 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* 重要性指示（仅有大模型评分时显示） */}
        {score && (
          <div className="flex gap-0.5" title={`紧急:${score.urgency} 重要:${score.importance}`}>
            {score.importance >= 7 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            )}
            {score.urgency >= 7 && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            )}
          </div>
        )}

        {/* 截止日期 */}
        {task.dueDateTime && <DueBadge dueDateTime={task.dueDateTime} />}

        {/* 高优先级标记（微软原始标记） */}
        {task.importance === 'high' && !score && (
          <span className="text-xs text-red-400">!</span>
        )}
      </div>
    </div>
  )
}
