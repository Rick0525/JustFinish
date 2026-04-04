import type { LLMScore, Quadrant, TodoTask } from '../types'
import { isOverdue, isToday, isTomorrow, parseGraphDate } from './dates'

/** 根据大模型评分映射到四象限 */
export function getQuadrant(score: LLMScore): Quadrant {
  const { urgency, importance } = score
  if (urgency >= 6 && importance >= 6) return 'doFirst'
  if (urgency < 6 && importance >= 6) return 'schedule'
  if (urgency >= 6 && importance < 6) return 'delegate'
  return 'later'
}

/** 无大模型时，根据截止日期做简单的四象限分类 */
export function getQuadrantByDate(task: TodoTask): Quadrant {
  const hasHighImportance = task.importance === 'high'
  const hasUrgency = task.dueDateTime
    ? isOverdue(task.dueDateTime) || isToday(task.dueDateTime) || isTomorrow(task.dueDateTime)
    : false

  if (hasUrgency && hasHighImportance) return 'doFirst'
  if (!hasUrgency && hasHighImportance) return 'schedule'
  if (hasUrgency && !hasHighImportance) return 'delegate'
  // 有截止日期但不紧急的，也放到 schedule
  if (task.dueDateTime && !hasUrgency) return 'schedule'
  return 'later'
}

/** 计算综合排序分数（越高越优先） */
export function getCompositeScore(score: LLMScore): number {
  return score.urgency * 1.2 + score.importance
}

/** 无大模型时的任务排序：超时优先 > 今天 > 明天 > 按日期升序 > 无日期 */
export function sortTasksByDate(tasks: TodoTask[]): TodoTask[] {
  return [...tasks].sort((a, b) => {
    // 都没有截止日期，按重要性排
    if (!a.dueDateTime && !b.dueDateTime) {
      const importanceOrder = { high: 0, normal: 1, low: 2 }
      return importanceOrder[a.importance] - importanceOrder[b.importance]
    }
    // 没有截止日期的排后面
    if (!a.dueDateTime) return 1
    if (!b.dueDateTime) return -1

    // 超时的排前面
    const aOverdue = isOverdue(a.dueDateTime)
    const bOverdue = isOverdue(b.dueDateTime)
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    // 按日期升序
    const aDate = parseGraphDate(a.dueDateTime)
    const bDate = parseGraphDate(b.dueDateTime)
    return aDate.getTime() - bDate.getTime()
  })
}
