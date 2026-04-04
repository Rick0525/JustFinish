import type { DateTimeTimeZone } from '../types'
import { formatDueDate, getDueDateStyle } from '../utils/dates'

interface DueBadgeProps {
  dueDateTime: DateTimeTimeZone
}

/** 截止日期标识组件 */
export function DueBadge({ dueDateTime }: DueBadgeProps) {
  const text = formatDueDate(dueDateTime)
  const style = getDueDateStyle(dueDateTime)

  return (
    <span className={`text-xs whitespace-nowrap ${style}`}>
      {text}
    </span>
  )
}
