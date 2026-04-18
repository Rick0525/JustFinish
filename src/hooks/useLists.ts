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

      // deltaLink 过期重置：upserted 为当前全量，缓存里多出来的是已被删除的
      if (listsResult.reset) {
        const prevCached = await getCachedLists()
        const stillExists = new Set(listsResult.upserted.map((l) => l.id))
        for (const l of prevCached) {
          if (!stillExists.has(l.id)) {
            removeList(l.id)
            await deleteCachedList(l.id)
            await deleteTasksByList(l.id)
            await deleteTasksDeltaLink(l.id)
          }
        }
      } else {
        // 正常增量：处理显式删除
        for (const removedId of listsResult.removed) {
          removeList(removedId)
          await deleteCachedList(removedId)
          await deleteTasksByList(removedId)
          await deleteTasksDeltaLink(removedId)
        }
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

      // ── 第二步：并发同步各列表的任务（滑动窗口，始终保持 3 个在跑） ──
      const CONCURRENCY = 3
      const taskResults: PromiseSettledResult<void>[] = new Array(allLists.length)
      let cursor = 0
      const worker = async () => {
        while (true) {
          const idx = cursor++
          if (idx >= allLists.length) return
          const list = allLists[idx]
          try {
            const taskDeltaLink = await getTasksDeltaLink(list.id)
            const result = await fetchTasksDelta(accessToken, list.id, taskDeltaLink)

            // delta 过期重置：upserted 是当前全量，清空该 list 的本地缓存避免残留
            if (result.reset) {
              await deleteTasksByList(list.id)
            }

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

            taskResults[idx] = { status: 'fulfilled', value: undefined }
          } catch (reason) {
            taskResults[idx] = { status: 'rejected', reason }
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, allLists.length) }, worker)
      )

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
