import { useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { fetchListsDelta, fetchTasksDelta } from '../services/graph'
import {
  getCachedLists,
  saveLists,
  deleteList as deleteCachedList,
  deleteTasksByList,
  getDeltaLink,
  saveDeltaLink,
  getTasksDeltaLink,
  saveTasksDeltaLink,
  deleteTasksDeltaLink,
  upsertTasks,
  deleteTask as deleteCachedTask,
  getCachedTasksByList,
} from '../services/cache'

/** 管理列表的 Delta 增量同步（含列表下的任务同步） */
export function useLists() {
  const { setLists, removeList, setTasksForList } = useAppStore()

  /** 从缓存加载列表 */
  const loadFromCache = useCallback(async () => {
    const cached = await getCachedLists()
    if (cached.length > 0) {
      setLists(cached)
    }
    return cached
  }, [setLists])

  /** Delta 同步列表及其任务 */
  const syncLists = useCallback(
    async (accessToken: string) => {
      // ── 第一步：同步列表 ──
      const deltaLink = await getDeltaLink()
      const listsResult = await fetchListsDelta(accessToken, deltaLink)

      // 处理删除（同时清理任务缓存和 tasks deltaLink）
      for (const removedId of listsResult.removed) {
        removeList(removedId)
        await deleteCachedList(removedId)
        await deleteTasksByList(removedId)
        await deleteTasksDeltaLink(removedId)
      }

      // 处理新增/更新
      if (listsResult.upserted.length > 0) {
        await saveLists(listsResult.upserted)
      }

      // 保存新的列表 deltaLink
      if (listsResult.deltaLink) {
        await saveDeltaLink(listsResult.deltaLink)
      }

      // 重新从缓存加载完整列表（确保状态一致）
      const allLists = await getCachedLists()
      setLists(allLists)

      // ── 第二步：并发同步各列表的任务（限制并发数为 3） ──
      const CONCURRENCY = 3
      const taskResults: PromiseSettledResult<void>[] = []
      for (let i = 0; i < allLists.length; i += CONCURRENCY) {
        const batch = allLists.slice(i, i + CONCURRENCY)
        const batchResults = await Promise.allSettled(
          batch.map(async (list) => {
            const taskDeltaLink = await getTasksDeltaLink(list.id)
            const result = await fetchTasksDelta(accessToken, list.id, taskDeltaLink)

            // 写入新增/更新的任务
            if (result.upserted.length > 0) {
              await upsertTasks(result.upserted)
            }
            // 删除已移除或已完成的任务
            for (const taskId of result.removed) {
              await deleteCachedTask(taskId)
            }
            // 保存新的 tasks deltaLink
            if (result.deltaLink) {
              await saveTasksDeltaLink(list.id, result.deltaLink)
            }

            // 从缓存读取当前列表的完整任务并更新 store
            const currentTasks = await getCachedTasksByList(list.id)
            setTasksForList(list.id, currentTasks)
          })
        )
        taskResults.push(...batchResults)
      }

      const failedCount = taskResults.filter((r) => r.status === 'rejected').length
      for (const r of taskResults) {
        if (r.status === 'rejected') {
          console.error('[Tasks] 列表任务同步失败:', r.reason)
        }
      }

      return { lists: allLists, failedCount }
    },
    [setLists, removeList, setTasksForList]
  )

  return { loadFromCache, syncLists }
}
