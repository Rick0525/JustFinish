import type { DateTimeTimeZone } from '../types'
import { getT } from '../i18n'

/** 将 Graph API 的 DateTimeTimeZone 转为本地 Date 对象 */
export function parseGraphDate(dt: DateTimeTimeZone): Date {
  // Graph API 返回的 dateTime 格式如 "2024-08-25T04:00:00.0000000"
  // timeZone 通常是 "UTC"
  const dateStr = dt.timeZone === 'UTC'
    ? `${dt.dateTime}Z`
    : dt.dateTime
  return new Date(dateStr)
}

/** 判断是否已超时（截止日期在今天之前） */
export function isOverdue(dt: DateTimeTimeZone): boolean {
  const due = parseGraphDate(dt)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

/** 判断是否是今天 */
export function isToday(dt: DateTimeTimeZone): boolean {
  const due = parseGraphDate(dt)
  const today = new Date()
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  )
}

/** 判断是否是明天 */
export function isTomorrow(dt: DateTimeTimeZone): boolean {
  const due = parseGraphDate(dt)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    due.getFullYear() === tomorrow.getFullYear() &&
    due.getMonth() === tomorrow.getMonth() &&
    due.getDate() === tomorrow.getDate()
  )
}

/** 格式化截止日期为友好的显示文本 */
export function formatDueDate(dt: DateTimeTimeZone): string {
  const t = getT()
  if (isOverdue(dt)) return t.taskOverdue
  if (isToday(dt)) return t.taskToday
  if (isTomorrow(dt)) return t.taskTomorrow

  const due = parseGraphDate(dt)
  // 显示月/日格式
  return `${due.getMonth() + 1}/${due.getDate()}`
}

/** 获取截止日期的样式类名 */
export function getDueDateStyle(dt: DateTimeTimeZone): string {
  if (isOverdue(dt)) return 'text-red-500 font-medium'
  if (isToday(dt)) return 'text-orange-500 font-medium'
  if (isTomorrow(dt)) return 'text-yellow-600'
  return 'text-gray-400'
}
