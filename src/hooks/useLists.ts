import { useCallback } from 'react'
import type { TodoTask } from '../types'
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
  deleteTasks,
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
            // worker 入口读一次 IDB 基线：reset 收尾时用来识别「同步期间本地已完成」的任务
            const memTasks = await getCachedTasksByList(list.id)
            // 410 重置标志：一旦置位就进入「缓冲」模式，到拉完后再按 id diff 统一落地
            let isReset = false
            const resetBuffer: TodoTask[] = []

            const result = await fetchTasksDelta(
              accessToken,
              list.id,
              taskDeltaLink,
              async ({ upserted, removed, reset }) => {
                if (reset) isReset = true
                if (isReset) {
                  // 重置场景：只缓冲服务端全量快照，UI/IDB 都不动，避免屏幕闪烁
                  // 全量端点不会返回 @removed，所以只需缓冲 upserted
                  resetBuffer.push(...upserted)
                  return
                }
                // 正常增量：写 IDB 持久化 + 合并到 store 推渐进渲染
                if (upserted.length > 0) await upsertTasks(upserted)
                if (removed.length > 0) await deleteTasks(removed)
                // 合并基用 store 当前状态而非 worker 入口的固定快照：
                // 同步期间用户若 completeTask 掉某个任务，store 已去掉它，这里不会再把它复活
                const current =
                  useAppStore.getState().tasksByList[list.id] ?? []
                const upsertIds = new Set(upserted.map((t) => t.id))
                const removedSet = new Set(removed)
                const next = current
                  .filter((t) => !upsertIds.has(t.id) && !removedSet.has(t.id))
                  .concat(upserted)
                setTasksForList(list.id, next)
              }
            )

            if (isReset) {
              // 全量快照到手：按 id 差集动作，且保留同步期间的本地删除
              // memTasks 有但 store 当前没的 id = 用户在同步中 completeTask 掉的任务
              // 这些任务服务端还没察觉（PATCH 可能晚于 Graph 快照），从 finalTasks 里剔除，
              // 避免被 resetBuffer 复活；下一轮 delta 会带它们回来做最终收敛
              const current =
                useAppStore.getState().tasksByList[list.id] ?? []
              const currentIds = new Set(current.map((t) => t.id))
              const locallyRemoved = new Set(
                memTasks
                  .filter((t) => !currentIds.has(t.id))
                  .map((t) => t.id)
              )
              const finalTasks = resetBuffer.filter(
                (t) => !locallyRemoved.has(t.id)
              )
              const finalIds = new Set(finalTasks.map((t) => t.id))
              const toDelete = memTasks
                .filter((t) => !finalIds.has(t.id))
                .map((t) => t.id)
              if (toDelete.length > 0) await deleteTasks(toDelete)
              if (finalTasks.length > 0) await upsertTasks(finalTasks)
              setTasksForList(list.id, finalTasks)
            }

            if (result.deltaLink) {
              await saveTasksDeltaLink(list.id, result.deltaLink)
            }

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
