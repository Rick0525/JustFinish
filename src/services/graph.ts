import type { TodoList, TodoTask } from '../types'
import { GRAPH_ENDPOINTS } from '../utils/constants'

/** Graph API 请求辅助函数 */
async function graphFetch<T>(
  url: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Graph API 错误 (${response.status}): ${error}`)
  }

  // 处理 204 No Content 或空响应体
  const text = await response.text()
  if (!text) return undefined as T

  return JSON.parse(text)
}

// ============ Delta 同步列表 ============

interface DeltaResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

interface DeltaListItem extends TodoList {
  '@removed'?: { reason: string }
}

/** Delta 同步列表结果 */
export interface ListsDeltaResult {
  /** 更新或新增的列表 */
  upserted: TodoList[]
  /** 被删除的列表 ID */
  removed: string[]
  /** 新的 deltaLink，下次同步用 */
  deltaLink: string
}

/**
 * 使用 Delta 查询同步列表
 * @param accessToken - Graph API 访问令牌
 * @param deltaLink - 上次的 deltaLink（首次同步传 null）
 */
export async function fetchListsDelta(
  accessToken: string,
  deltaLink: string | null
): Promise<ListsDeltaResult> {
  const upserted: TodoList[] = []
  const removed: string[] = []

  // 首次用 delta 端点，后续用上次的 deltaLink
  let url = deltaLink || GRAPH_ENDPOINTS.listsDelta

  // 循环处理分页（nextLink）
  while (url) {
    const response = await graphFetch<DeltaResponse<DeltaListItem>>(url, accessToken)

    for (const item of response.value) {
      if (item['@removed']) {
        removed.push(item.id)
      } else {
        upserted.push({
          id: item.id,
          displayName: item.displayName,
          isOwner: item.isOwner,
          isShared: item.isShared,
          wellknownListName: item.wellknownListName,
        })
      }
    }

    if (response['@odata.nextLink']) {
      url = response['@odata.nextLink']
    } else {
      return {
        upserted,
        removed,
        deltaLink: response['@odata.deltaLink'] || '',
      }
    }
  }

  // 不应到达这里，但为了类型安全返回
  return { upserted, removed, deltaLink: '' }
}

// ============ 获取任务（全量，供错误回滚用） ============

interface TasksResponse {
  value: Omit<TodoTask, 'listId'>[]
  '@odata.nextLink'?: string
}

/**
 * 获取指定列表中未完成的任务（全量拉取，仅用于 completeTask 错误回滚）
 * @param accessToken - Graph API 访问令牌
 * @param listId - 列表 ID
 */
export async function fetchTasks(
  accessToken: string,
  listId: string
): Promise<TodoTask[]> {
  const tasks: TodoTask[] = []
  let url = `${GRAPH_ENDPOINTS.tasks(listId)}?$filter=status ne 'completed'`

  // 处理分页
  while (url) {
    const response = await graphFetch<TasksResponse>(url, accessToken)
    for (const task of response.value) {
      tasks.push({ ...task, listId })
    }
    url = response['@odata.nextLink'] || ''
  }

  return tasks
}

// ============ Delta 增量同步任务 ============

interface DeltaTaskItem extends Omit<TodoTask, 'listId'> {
  '@removed'?: { reason: string }
}

/** Delta 同步任务结果 */
export interface TasksDeltaResult {
  /** 新增或更新的未完成任务 */
  upserted: TodoTask[]
  /** 需要从本地删除的任务 ID（已在服务端删除或已完成） */
  removed: string[]
  /** 新的 deltaLink，下次同步用 */
  deltaLink: string
}

/**
 * 使用 Delta 查询增量同步指定列表的任务
 * @param accessToken - Graph API 访问令牌
 * @param listId - 列表 ID
 * @param deltaLink - 上次的 deltaLink（首次同步传 null）
 */
export async function fetchTasksDelta(
  accessToken: string,
  listId: string,
  deltaLink: string | null
): Promise<TasksDeltaResult> {
  const upserted: TodoTask[] = []
  const removed: string[] = []

  let url = deltaLink || GRAPH_ENDPOINTS.tasksDelta(listId)

  while (url) {
    const response = await graphFetch<DeltaResponse<DeltaTaskItem>>(url, accessToken)

    for (const item of response.value) {
      if (item['@removed'] || item.status === 'completed') {
        removed.push(item.id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { '@removed': _removed, ...task } = item as DeltaTaskItem & { '@removed'?: unknown }
        upserted.push({ ...(task as Omit<TodoTask, 'listId'>), listId })
      }
    }

    if (response['@odata.nextLink']) {
      url = response['@odata.nextLink']
    } else {
      return {
        upserted,
        removed,
        deltaLink: response['@odata.deltaLink'] || '',
      }
    }
  }

  return { upserted, removed, deltaLink: '' }
}

// ============ 完成任务 ============

/**
 * 标记任务为已完成
 * @param accessToken - Graph API 访问令牌
 * @param listId - 列表 ID
 * @param taskId - 任务 ID
 */
export async function completeTask(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  await graphFetch(
    GRAPH_ENDPOINTS.task(listId, taskId),
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    }
  )
}
