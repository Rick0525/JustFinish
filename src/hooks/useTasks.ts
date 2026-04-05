import { useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { fetchTasks, completeTask as graphCompleteTask } from '../services/graph'
import {
  getCachedTasks,
  saveTasksForList,
  deleteTask as deleteCachedTask,
} from '../services/cache'
import type { TodoList } from '../types'

/** 管理任务的获取、缓存和完成 */
export function useTasks() {
  const { setTasksForList, removeTask } = useAppStore()

  /** 从缓存加载所有任务 */
  const loadFromCache = useCallback(async () => {
    const cached = await getCachedTasks()
    // 按 listId 分组
    const grouped: Record<string, typeof cached> = {}
    for (const task of cached) {
      if (!grouped[task.listId]) grouped[task.listId] = []
      grouped[task.listId].push(task)
    }
    for (const [listId, tasks] of Object.entries(grouped)) {
      setTasksForList(listId, tasks)
    }
    return cached
  }, [setTasksForList])

  /** 同步所有列表的任务，返回 { tasks, failedCount } */
  const syncTasks = useCallback(
    async (accessToken: string, lists: TodoList[]) => {
      const results = await Promise.allSettled(
        lists.map(async (list) => {
          const tasks = await fetchTasks(accessToken, list.id)
          await saveTasksForList(list.id, tasks)
          setTasksForList(list.id, tasks)
          return tasks
        })
      )

      const failedCount = results.filter((r) => r.status === 'rejected').length
      for (const r of results) {
        if (r.status === 'rejected') {
          console.error('[Tasks] 列表同步失败:', r.reason)
        }
      }

      const allTasks = results
        .filter(
          (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchTasks>>> =>
            r.status === 'fulfilled'
        )
        .flatMap((r) => r.value)

      return { tasks: allTasks, failedCount }
    },
    [setTasksForList]
  )

  /** 完成单个任务（乐观更新） */
  const completeTask = useCallback(
    async (accessToken: string, listId: string, taskId: string) => {
      // 保存快照用于回滚
      const snapshot = useAppStore.getState().tasksByList[listId] || []

      // 乐观更新：先从 UI 移除
      removeTask(listId, taskId)
      await deleteCachedTask(taskId)

      try {
        // 发送 PATCH 请求到 Graph API
        await graphCompleteTask(accessToken, listId, taskId)
      } catch (error) {
        // 立即恢复 UI 和缓存
        setTasksForList(listId, snapshot)
        await saveTasksForList(listId, snapshot)
        // 然后尝试从服务器获取最新数据
        try {
          const tasks = await fetchTasks(accessToken, listId)
          await saveTasksForList(listId, tasks)
          setTasksForList(listId, tasks)
        } catch (fetchErr) {
          console.error('[Tasks] 回滚后重新获取失败:', fetchErr)
        }
        throw error
      }
    },
    [removeTask, setTasksForList]
  )

  return { loadFromCache, syncTasks, completeTask }
}
