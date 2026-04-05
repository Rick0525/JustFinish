import { useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { fetchListsDelta } from '../services/graph'
import {
  getCachedLists,
  saveLists,
  deleteList as deleteCachedList,
  deleteTasksByList,
  getDeltaLink,
  saveDeltaLink,
} from '../services/cache'

/** 管理列表的 Delta 增量同步 */
export function useLists() {
  const { setLists, removeList } = useAppStore()

  /** 从缓存加载列表 */
  const loadFromCache = useCallback(async () => {
    const cached = await getCachedLists()
    if (cached.length > 0) {
      setLists(cached)
    }
    return cached
  }, [setLists])

  /** Delta 同步列表 */
  const syncLists = useCallback(
    async (accessToken: string) => {
      const deltaLink = await getDeltaLink()
      const result = await fetchListsDelta(accessToken, deltaLink)

      // 处理删除（同时清理该列表下的任务缓存）
      for (const removedId of result.removed) {
        removeList(removedId)
        await deleteCachedList(removedId)
        await deleteTasksByList(removedId)
      }

      // 处理新增/更新
      if (result.upserted.length > 0) {
        await saveLists(result.upserted)
      }

      // 保存新的 deltaLink
      if (result.deltaLink) {
        await saveDeltaLink(result.deltaLink)
      }

      // 重新从缓存加载完整列表（确保状态一致）
      const allLists = await getCachedLists()
      setLists(allLists)

      return allLists
    },
    [setLists, removeList]
  )

  return { loadFromCache, syncLists }
}
