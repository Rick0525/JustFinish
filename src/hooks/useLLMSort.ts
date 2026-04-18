import { useCallback } from 'react'
import { useAppStore, getVisibleTasks } from '../stores/appStore'
import {
  getCachedLLMScores,
  saveLLMScores,
  getLLMHash,
  saveLLMHash,
} from '../services/cache'
import { sortTasksWithLLM, computeTaskHash } from '../services/llm'
import type { LLMConfig } from '../types'

/** 管理大模型排序逻辑 */
export function useLLMSort() {
  const { setLLMScores, setIsSorting } = useAppStore()

  /** 从缓存加载评分 */
  const loadFromCache = useCallback(async () => {
    const cached = await getCachedLLMScores()
    if (cached.length > 0) {
      setLLMScores(cached)
    }
    return cached
  }, [setLLMScores])

  /** 执行大模型排序 */
  const runSort = useCallback(
    async (config: LLMConfig) => {
      const state = useAppStore.getState()
      const tasks = getVisibleTasks(state)

      if (tasks.length === 0) return

      // 检查任务集合是否变化
      const currentHash = computeTaskHash(tasks)
      const cachedHash = await getLLMHash()

      if (currentHash === cachedHash) {
        // 任务没变化，使用缓存的评分
        await loadFromCache()
        return
      }

      // 任务有变化，调用大模型
      setIsSorting(true)
      try {
        const scores = await sortTasksWithLLM(tasks, config)
        await saveLLMScores(scores)
        await saveLLMHash(currentHash)
        setLLMScores(scores)
      } finally {
        setIsSorting(false)
      }
    },
    [setLLMScores, setIsSorting, loadFromCache]
  )

  /** 强制重新排序（忽略缓存） */
  const forceSort = useCallback(
    async (config: LLMConfig) => {
      const state = useAppStore.getState()
      const tasks = getVisibleTasks(state)

      if (tasks.length === 0) return

      setIsSorting(true)
      try {
        const scores = await sortTasksWithLLM(tasks, config)
        const currentHash = computeTaskHash(tasks)
        await saveLLMScores(scores)
        await saveLLMHash(currentHash)
        setLLMScores(scores)
      } finally {
        setIsSorting(false)
      }
    },
    [setLLMScores, setIsSorting]
  )

  return { loadFromCache, runSort, forceSort }
}
