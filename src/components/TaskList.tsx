import type { TodoTask, LLMScore } from '../types'
import { TaskItem } from './TaskItem'
import { useT } from '../i18n'

interface TaskListProps {
  tasks: TodoTask[]
  scores: Record<string, LLMScore>
  onComplete: (listId: string, taskId: string) => Promise<void>
  emptyMessage?: string
}

/** 任务列表组件 */
export function TaskList({ tasks, scores, onComplete, emptyMessage }: TaskListProps) {
  const t = useT()

  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm">
        {emptyMessage || t.noTasks}
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          score={scores[task.id]}
          onComplete={onComplete}
        />
      ))}
    </div>
  )
}
