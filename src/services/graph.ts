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

  return response.json()
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

// ============ 获取任务 ============

interface TasksResponse {
  value: Omit<TodoTask, 'listId'>[]
  '@odata.nextLink'?: string
}

/**
 * 获取指定列表中未完成的任务
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
