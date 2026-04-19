import type { TodoList, TodoTask } from '../types'
import { GRAPH_ENDPOINTS } from '../utils/constants'

/**
 * Delta / 全量拉取的单页大小（通过 `Prefer: odata.maxpagesize=N` 请求头传递）。
 * Graph 默认每页约 50 条，有内置上限。给一个足够大的值让服务端按自己上限给满，一次尽量拿完。
 * 参考：https://learn.microsoft.com/zh-cn/graph/api/todotask-delta —— 「请求标头」一节
 */
const DELTA_PAGE_SIZE = 1000

/** 每个 Delta/全量请求都携带的分页偏好头 */
const PREFER_HEADER: Record<string, string> = {
  Prefer: `odata.maxpagesize=${DELTA_PAGE_SIZE}`,
}

/** 带 HTTP 状态码的 Graph API 错误 */
export class GraphError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GraphError'
    this.status = status
  }
}

/** delta token 失效时 Graph 返回 410 SyncStateNotFound */
function isDeltaExpired(err: unknown): boolean {
  return err instanceof GraphError && err.status === 410
}

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
    throw new GraphError(response.status, `Graph API 错误 (${response.status}): ${error}`)
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
  /** 本次是否因 deltaLink 过期而做了全量重置（调用方需对账清理本地缓存） */
  reset: boolean
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

  // 首次用 delta 端点，后续用上次的 deltaLink；分页大小通过 Prefer 头传递
  let url = deltaLink || GRAPH_ENDPOINTS.listsDelta
  let retriedFromScratch = false

  // 循环处理分页（nextLink）
  while (url) {
    let response: DeltaResponse<DeltaListItem>
    try {
      response = await graphFetch<DeltaResponse<DeltaListItem>>(url, accessToken, {
        headers: PREFER_HEADER,
      })
    } catch (err) {
      // delta token 失效：清空已累计结果，从基础端点重试一次
      if (isDeltaExpired(err) && !retriedFromScratch) {
        retriedFromScratch = true
        upserted.length = 0
        removed.length = 0
        url = GRAPH_ENDPOINTS.listsDelta
        continue
      }
      throw err
    }

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
        reset: retriedFromScratch,
      }
    }
  }

  // 不应到达这里，但为了类型安全返回
  return { upserted, removed, deltaLink: '', reset: retriedFromScratch }
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

  // 处理分页；分页大小用 Prefer 头
  while (url) {
    const response = await graphFetch<TasksResponse>(url, accessToken, {
      headers: PREFER_HEADER,
    })
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
  /** 本次是否因 deltaLink 过期而做了全量重置 */
  reset: boolean
}

/** `fetchTasksDelta` 按页流式回调的入参 */
export interface TasksDeltaPage {
  /** 本页新增或更新的未完成任务 */
  upserted: TodoTask[]
  /** 本页需要从本地删除的任务 ID（已在服务端删除或已完成） */
  removed: string[]
  /**
   * 仅在 410 重试后的**首次**回调里为 `true`——表示这一轮 Delta 在函数内部已回退到基础端点，
   * 当前及后续页均是服务端全量快照而非增量。调用方据此决定是否切到缓冲 / 对账模式。
   */
  reset: boolean
}

/**
 * 使用 Delta 查询增量同步指定列表的任务
 * @param accessToken - Graph API 访问令牌
 * @param listId - 列表 ID
 * @param deltaLink - 上次的 deltaLink（首次同步传 null）
 * @param onPage - 可选的流式回调：每拉完一页立即回调，然后再请求 `nextLink`。
 *   传入 `onPage` 时**不再累积**整体数组（避免大账号撑爆内存），返回值的 `upserted` / `removed`
 *   均为空数组，只有 `deltaLink` 和 `reset` 有意义。
 */
export async function fetchTasksDelta(
  accessToken: string,
  listId: string,
  deltaLink: string | null,
  onPage?: (page: TasksDeltaPage) => void | Promise<void>
): Promise<TasksDeltaResult> {
  const streaming = typeof onPage === 'function'
  const upserted: TodoTask[] = []
  const removed: string[] = []

  let url = deltaLink || GRAPH_ENDPOINTS.tasksDelta(listId)
  let retriedFromScratch = false
  // 流式模式下，仅第一次触发 onPage 时带 reset=true
  let resetPending = false

  while (url) {
    let response: DeltaResponse<DeltaTaskItem>
    try {
      response = await graphFetch<DeltaResponse<DeltaTaskItem>>(url, accessToken, {
        headers: PREFER_HEADER,
      })
    } catch (err) {
      if (isDeltaExpired(err) && !retriedFromScratch) {
        // TODO: edge case——若流式调用方已经通过 onPage 写过数据再遇到 410（理论上 nextLink 不过期，
        // 实际几乎不触发），之前写入的 IDB/store 不会被撤销。Graph 规范承诺 nextLink 不过期，暂不补偿。
        retriedFromScratch = true
        resetPending = true
        upserted.length = 0
        removed.length = 0
        url = GRAPH_ENDPOINTS.tasksDelta(listId)
        continue
      }
      throw err
    }

    // 解析本页，流式模式写入本页局部数组，累积模式写进函数级数组
    const pageUpserted: TodoTask[] = streaming ? [] : upserted
    const pageRemoved: string[] = streaming ? [] : removed
    for (const item of response.value) {
      if (item['@removed'] || item.status === 'completed') {
        pageRemoved.push(item.id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { '@removed': _removed, ...task } = item as DeltaTaskItem & { '@removed'?: unknown }
        pageUpserted.push({ ...(task as Omit<TodoTask, 'listId'>), listId })
      }
    }

    if (streaming) {
      await onPage!({ upserted: pageUpserted, removed: pageRemoved, reset: resetPending })
      resetPending = false
    }

    if (response['@odata.nextLink']) {
      url = response['@odata.nextLink']
    } else {
      return {
        upserted,
        removed,
        deltaLink: response['@odata.deltaLink'] || '',
        reset: retriedFromScratch,
      }
    }
  }

  return { upserted, removed, deltaLink: '', reset: retriedFromScratch }
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
