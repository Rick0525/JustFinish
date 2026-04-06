import { useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { fetchTasks, completeTask as graphCompleteTask } from '../services/graph'
import {
  getCachedTasks,
  saveTasksForList,
  deleteTask as deleteCachedTask,
} from '../services/cache'

/** 管理任务的缓存加载和完成操作 */
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

  return { loadFromCache, completeTask }
}
